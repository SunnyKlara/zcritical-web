import { env } from '../config/env'
import { logger } from '../config/logger'

/**
 * PayPal REST API v2 integration (Orders API).
 * Handles OAuth token lifecycle, order creation, capture, and refund.
 *
 * Amounts are passed as cents (integer) and converted to dollar strings
 * at the boundary — never use floats for money internally.
 */

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com'
const LIVE_BASE = 'https://api-m.paypal.com'

function getBaseUrl(): string {
  return env.PAYPAL_MODE === 'live' ? LIVE_BASE : SANDBOX_BASE
}

// ─── OAuth token cache ──────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const clientId = env.PAYPAL_CLIENT_ID
  const clientSecret = env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text()
    logger.error({ status: res.status, body }, 'PayPal OAuth token request failed')
    throw new Error(`PayPal OAuth failed: ${res.status}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000
  return cachedToken
}

async function paypalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text()
    logger.error({ status: res.status, path, body }, 'PayPal API error')
    throw new Error(`PayPal API ${res.status}: ${body}`)
  }

  return (await res.json()) as T
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreatePayPalOrderParams {
  orderNo: string
  description: string
  items: {
    name: string
    sku: string
    unitAmount: number // cents
    quantity: number
  }[]
  subtotal: number
  shipping: number
  total: number
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  returnUrl: string
  cancelUrl: string
}

interface PayPalLink {
  href: string
  rel: string
  method: string
}

interface PayPalOrderResponse {
  id: string
  status: string
  links: PayPalLink[]
}

interface PayPalCaptureAmount {
  currency_code: string
  value: string
}

interface PayPalCapture {
  id: string
  status: string
  amount: PayPalCaptureAmount
}

interface PayPalCaptureResponse {
  id: string
  status: string
  purchase_units: {
    reference_id: string
    payments: { captures: PayPalCapture[] }
  }[]
}

interface PayPalRefundResponse {
  id: string
  status: string
  amount: PayPalCaptureAmount
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function createPayPalOrder(
  params: CreatePayPalOrderParams,
): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.orderNo,
        description: params.description,
        amount: {
          currency_code: 'USD',
          value: centsToDollars(params.total),
          breakdown: {
            item_total: { currency_code: 'USD', value: centsToDollars(params.subtotal) },
            shipping: { currency_code: 'USD', value: centsToDollars(params.shipping) },
          },
        },
        items: params.items.map((item) => ({
          name: item.name,
          sku: item.sku,
          unit_amount: { currency_code: 'USD', value: centsToDollars(item.unitAmount) },
          quantity: String(item.quantity),
          category: 'PHYSICAL_GOODS' as const,
        })),
        shipping: {
          name: { full_name: params.shippingAddress.fullName },
          address: {
            address_line_1: params.shippingAddress.line1,
            ...(params.shippingAddress.line2
              ? { address_line_2: params.shippingAddress.line2 }
              : {}),
            admin_area_2: params.shippingAddress.city,
            admin_area_1: params.shippingAddress.state,
            postal_code: params.shippingAddress.postalCode,
            country_code: params.shippingAddress.country,
          },
        },
      },
    ],
    application_context: {
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      brand_name: 'Critical',
      shipping_preference: 'SET_PROVIDED_ADDRESS',
      user_action: 'PAY_NOW',
    },
  }

  const data = await paypalFetch<PayPalOrderResponse>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const approveLink = data.links.find((l) => l.rel === 'approve')
  if (!approveLink) {
    throw new Error('PayPal response missing approve link')
  }

  return { paypalOrderId: data.id, approveUrl: approveLink.href }
}

export async function capturePayPalOrder(
  paypalOrderId: string,
): Promise<{ captureId: string; amount: number; raw: unknown }> {
  const data = await paypalFetch<PayPalCaptureResponse>(
    `/v2/checkout/orders/${paypalOrderId}/capture`,
    { method: 'POST' },
  )

  const capture = data.purchase_units[0]?.payments?.captures?.[0]
  if (!capture || capture.status !== 'COMPLETED') {
    throw new Error(`PayPal capture not completed: ${capture?.status ?? 'no capture'}`)
  }

  const amountCents = Math.round(parseFloat(capture.amount.value) * 100)

  return {
    captureId: capture.id,
    amount: amountCents,
    raw: data,
  }
}

export async function refundPayPalCapture(
  captureId: string,
  amount: number,
  noteToPayee?: string,
): Promise<{ refundId: string; raw: unknown }> {
  const body: Record<string, unknown> = {
    amount: { currency_code: 'USD', value: centsToDollars(amount) },
  }
  if (noteToPayee) body.note_to_payer = noteToPayee

  const data = await paypalFetch<PayPalRefundResponse>(
    `/v2/payments/captures/${captureId}/refund`,
    { method: 'POST', body: JSON.stringify(body) },
  )

  return { refundId: data.id, raw: data }
}

export async function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  body: string,
): Promise<boolean> {
  if (!env.PAYPAL_WEBHOOK_ID) {
    logger.warn('PAYPAL_WEBHOOK_ID not set — skipping webhook verification')
    return false
  }

  const get = (key: string) => {
    const v = headers[key.toLowerCase()]
    return Array.isArray(v) ? v[0] : v
  }

  const verifyBody = {
    auth_algo: get('paypal-auth-algo'),
    cert_url: get('paypal-cert-url'),
    transmission_id: get('paypal-transmission-id'),
    transmission_sig: get('paypal-transmission-sig'),
    transmission_time: get('paypal-transmission-time'),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(body) as unknown,
  }

  try {
    const data = await paypalFetch<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      { method: 'POST', body: JSON.stringify(verifyBody) },
    )
    return data.verification_status === 'SUCCESS'
  } catch (err) {
    logger.error({ err }, 'PayPal webhook verification failed')
    return false
  }
}
