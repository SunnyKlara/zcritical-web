/**
 * Backend API client for Critical website.
 *
 * Reads `NEXT_PUBLIC_BACKEND_URL` from validated env.
 * All POST requests automatically include the CSRF token from cookie (set by
 * backend's csrfCookieSetter middleware).
 */
import { env } from './env'

const BACKEND_URL = env.NEXT_PUBLIC_BACKEND_URL

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Read a cookie by name (browser-only). Returns undefined on server. */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : undefined
}

/**
 * Issue a JSON request to the backend with CSRF + credentials.
 * Throws `ApiError` for non-2xx responses.
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`
  const csrfToken = getCookie('critical_csrf')

  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch (err) {
    // Network error / CORS / timeout
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }

  let body: unknown = null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      (body as { error?: string })?.error ?? `Request failed with status ${response.status}`
    throw new ApiError(response.status, errorMessage, body)
  }

  return body as T
}

// ─── Lead API ────────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: 'zh' | 'en'
  /** Honeypot — leave empty. */
  website?: string
}

export interface CreateLeadResponse {
  ok: boolean
  id?: string
}

/** Submit a lead to the backend. */
export async function createLead(input: CreateLeadInput): Promise<CreateLeadResponse> {
  return apiFetch<CreateLeadResponse>('/api/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// ─── Product API ─────────────────────────────────────────────────────────────

export async function listProducts<T>(): Promise<T[]> {
  return apiFetch<T[]>('/api/products')
}

export async function getProduct<T>(slug: string): Promise<T> {
  return apiFetch<T>(`/api/products/${encodeURIComponent(slug)}`)
}

// ─── Order API ───────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  email: string
  locale: 'zh' | 'en'
  items: { sku: string; quantity: number }[]
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }
}

export interface CreateOrderResponse {
  orderNo: string
  total: number
  currency: string
  approveUrl: string
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface CapturePaymentResponse {
  orderNo: string
  status: string
}

export async function capturePayment(paypalOrderId: string): Promise<CapturePaymentResponse> {
  return apiFetch<CapturePaymentResponse>('/api/orders/payments/paypal/capture', {
    method: 'POST',
    body: JSON.stringify({ paypalOrderId }),
  })
}

export interface OrderLookupResult {
  orderNo: string
  status: string
  total: number
  currency: string
  items: { name: string; sku: string; price: number; quantity: number; image: string }[]
  shippingCity: string
  shippingCountry: string
  fulfillment?: {
    carrier?: string
    trackingNo?: string
    trackingUrl?: string
    shippedAt?: string
  }
  createdAt: string
  paidAt?: string
}

export async function lookupOrder(email: string, orderNo: string): Promise<OrderLookupResult> {
  const qs = new URLSearchParams({ email, orderNo })
  return apiFetch<OrderLookupResult>(`/api/orders/lookup?${qs}`)
}
