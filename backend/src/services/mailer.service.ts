import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../config/logger'
import type { OrderDocument } from '../models/Order.model'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  return transporter
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c] ?? c
  })
}

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const SITE_URL = env.FRONTEND_URL

// ─── Shared email shell ──────────────────────────────────────────────────────

const emailShell = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:20px;">
        <span style="display:inline-block;width:32px;height:32px;border-radius:8px;background:#0A0A0A;color:#00D4FF;font-weight:800;line-height:32px;font-size:18px;text-align:center;">C</span>
        <span style="margin-left:8px;font-size:18px;color:#111;font-weight:700;letter-spacing:1px;vertical-align:middle;">CRITICAL</span>
      </div>
      ${body}
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">
      &copy; ${new Date().getFullYear()} Critical · <a href="${SITE_URL}" style="color:#999;">critical.bike</a>
    </p>
  </div>
</body>
</html>`

// ─── Lead notification (admin-facing) ────────────────────────────────────────

export async function notifyNewLead(lead: {
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: string
}): Promise<void> {
  const tx = getTransporter()
  if (!tx || !env.NOTIFY_EMAIL) {
    logger.debug('SMTP / NOTIFY_EMAIL not configured — skipping lead notification')
    return
  }
  try {
    await tx.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: env.NOTIFY_EMAIL,
      subject: `[Lead] ${lead.name} · ${lead.company || lead.email}`,
      html: `
        <h2>New lead submitted</h2>
        <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
        ${lead.company ? `<p><strong>Company:</strong> ${escapeHtml(lead.company)}</p>` : ''}
        ${lead.phone ? `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>` : ''}
        ${lead.source ? `<p><strong>Source:</strong> ${escapeHtml(lead.source)}</p>` : ''}
        ${lead.locale ? `<p><strong>Locale:</strong> ${escapeHtml(lead.locale)}</p>` : ''}
        <hr/>
        <p>${escapeHtml(lead.message).replace(/\n/g, '<br/>')}</p>
      `,
    })
    logger.info({ to: env.NOTIFY_EMAIL }, 'Lead notification email sent')
  } catch (err) {
    logger.error({ err }, 'Failed to send lead notification email')
  }
}

// ─── Order confirmation (buyer-facing, after capture) ────────────────────────

export async function notifyOrderConfirmed(order: OrderDocument): Promise<void> {
  const tx = getTransporter()
  if (!tx) {
    logger.debug('SMTP not configured — skipping order confirmation email')
    return
  }

  const isZh = order.locale === 'zh'
  const subject = isZh
    ? `[Critical] 订单确认 — ${order.orderNo}`
    : `[Critical] Order Confirmed — ${order.orderNo}`

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;color:#111;">
          ${escapeHtml(item.name)}
          <br/><span style="color:#999;font-size:12px;">SKU: ${escapeHtml(item.sku)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;color:#555;">${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#111;">${centsToDollars(item.price)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#111;font-weight:600;">${centsToDollars(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join('')

  const addr = order.shippingAddress
  const addressHtml = `${escapeHtml(addr.fullName)}<br/>
    ${escapeHtml(addr.line1)}${addr.line2 ? '<br/>' + escapeHtml(addr.line2) : ''}<br/>
    ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}<br/>
    ${escapeHtml(addr.country)}${addr.phone ? '<br/>' + escapeHtml(addr.phone) : ''}`

  const lookupUrl = `${SITE_URL}/${order.locale === 'zh' ? '' : order.locale + '/'}order-lookup?orderNo=${encodeURIComponent(order.orderNo)}`

  const body = `
    <h2 style="color:#111;margin:0 0 16px;font-size:22px;">${isZh ? '感谢您的订单！' : 'Thanks for your order!'}</h2>
    <p style="color:#555;line-height:1.6;">${isZh ? '您的订单已确认，以下是详细信息：' : 'Your order is confirmed. Details below:'}</p>

    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:12px;color:#888;letter-spacing:0.5px;">${isZh ? '订单号' : 'ORDER NO.'}</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:bold;font-family:'SF Mono',Consolas,monospace;color:#111;">${escapeHtml(order.orderNo)}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="border-bottom:2px solid #ddd;">
          <th style="text-align:left;padding:8px 0;color:#666;font-weight:600;">${isZh ? '商品' : 'Item'}</th>
          <th style="text-align:center;padding:8px 0;color:#666;font-weight:600;">${isZh ? '数量' : 'Qty'}</th>
          <th style="text-align:right;padding:8px 0;color:#666;font-weight:600;">${isZh ? '单价' : 'Price'}</th>
          <th style="text-align:right;padding:8px 0;color:#666;font-weight:600;">${isZh ? '小计' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="margin-top:20px;font-size:14px;">
      <div style="display:flex;justify-content:space-between;padding:6px 0;color:#666;">
        <span>${isZh ? '商品小计' : 'Subtotal'}</span>
        <span>${centsToDollars(order.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;color:#666;">
        <span>${isZh ? '运费' : 'Shipping'}</span>
        <span>${centsToDollars(order.shipping)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #ddd;font-weight:bold;font-size:16px;color:#111;">
        <span>${isZh ? '合计' : 'Total'}</span>
        <span>${centsToDollars(order.total)} USD</span>
      </div>
    </div>

    <h3 style="margin:32px 0 8px;font-size:14px;color:#111;text-transform:uppercase;letter-spacing:0.5px;">${isZh ? '收货地址' : 'Shipping address'}</h3>
    <p style="color:#555;font-size:14px;line-height:1.7;">${addressHtml}</p>

    <p style="color:#555;font-size:14px;margin-top:20px;">
      ${isZh ? '预计 7-15 个工作日送达（视目的地而定）。' : 'Estimated delivery: 7-15 business days (varies by destination).'}
    </p>

    <div style="text-align:center;margin-top:32px;">
      <a href="${lookupUrl}" style="display:inline-block;background:#0A0A0A;color:#00D4FF;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
        ${isZh ? '查询订单' : 'Track your order'}
      </a>
    </div>

    <p style="color:#999;font-size:12px;margin-top:32px;text-align:center;border-top:1px solid #eee;padding-top:20px;">
      ${isZh ? '如有疑问请联系' : 'Questions?'} <a href="mailto:support@critical.bike" style="color:#00A3CC;">support@critical.bike</a>
    </p>`

  try {
    await tx.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: order.email,
      subject,
      html: emailShell(subject, body),
    })
    logger.info({ orderNo: order.orderNo, email: order.email }, 'Order confirmation email sent')
  } catch (err) {
    logger.error({ err, orderNo: order.orderNo }, 'Failed to send order confirmation email')
  }
}

// ─── Shipping notification ───────────────────────────────────────────────────

export async function notifyOrderShipped(order: OrderDocument): Promise<void> {
  const tx = getTransporter()
  if (!tx) return

  const isZh = order.locale === 'zh'
  const subject = isZh
    ? `[Critical] 您的订单已发货 — ${order.orderNo}`
    : `[Critical] Your order has shipped — ${order.orderNo}`

  const f = order.fulfillment
  const trackingHtml = f?.trackingUrl
    ? `<a href="${escapeHtml(f.trackingUrl)}" style="color:#0070ba;text-decoration:underline;">${escapeHtml(f.trackingNo || '')}</a>`
    : escapeHtml(f?.trackingNo || '—')

  const body = `
    <h2 style="color:#111;margin:0 0 16px;font-size:22px;">${isZh ? '您的订单已发货！' : 'Your order is on its way!'}</h2>

    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:12px;color:#888;letter-spacing:0.5px;">${isZh ? '订单号' : 'ORDER NO.'}</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:bold;font-family:'SF Mono',Consolas,monospace;color:#111;">${escapeHtml(order.orderNo)}</p>
    </div>

    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px;">
      <tr>
        <td style="padding:10px 0;color:#888;width:140px;">${isZh ? '物流商' : 'Carrier'}</td>
        <td style="padding:10px 0;font-weight:500;color:#111;">${escapeHtml(f?.carrier || '—')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;">${isZh ? '物流单号' : 'Tracking number'}</td>
        <td style="padding:10px 0;font-weight:500;font-family:'SF Mono',Consolas,monospace;">${trackingHtml}</td>
      </tr>
    </table>

    <p style="color:#555;font-size:14px;margin-top:20px;">
      ${isZh ? '预计 7-15 个工作日送达，视目的地而定。' : 'Estimated delivery: 7-15 business days, varies by destination.'}
    </p>

    ${
      f?.trackingUrl
        ? `
    <div style="text-align:center;margin-top:32px;">
      <a href="${escapeHtml(f.trackingUrl)}" style="display:inline-block;background:#0A0A0A;color:#00D4FF;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
        ${isZh ? '在物流商查询' : 'Track on carrier'}
      </a>
    </div>`
        : ''
    }

    <p style="color:#999;font-size:12px;margin-top:32px;text-align:center;border-top:1px solid #eee;padding-top:20px;">
      ${isZh ? '如有疑问请联系' : 'Questions?'} <a href="mailto:support@critical.bike" style="color:#00A3CC;">support@critical.bike</a>
    </p>`

  try {
    await tx.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: order.email,
      subject,
      html: emailShell(subject, body),
    })
    logger.info({ orderNo: order.orderNo }, 'Shipping notification email sent')
  } catch (err) {
    logger.error({ err, orderNo: order.orderNo }, 'Failed to send shipping email')
  }
}

// ─── Refund notification ─────────────────────────────────────────────────────

export async function notifyOrderRefunded(
  order: OrderDocument,
  refundAmount: number,
): Promise<void> {
  const tx = getTransporter()
  if (!tx) return

  const isZh = order.locale === 'zh'
  const subject = isZh
    ? `[Critical] 退款已处理 — ${order.orderNo}`
    : `[Critical] Refund processed — ${order.orderNo}`

  const body = `
    <h2 style="color:#111;margin:0 0 16px;font-size:22px;">${isZh ? '退款已处理' : 'Your refund has been processed'}</h2>

    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:12px;color:#888;letter-spacing:0.5px;">${isZh ? '订单号' : 'ORDER NO.'}</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:bold;font-family:'SF Mono',Consolas,monospace;color:#111;">${escapeHtml(order.orderNo)}</p>
    </div>

    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px;">
      <tr>
        <td style="padding:10px 0;color:#888;width:140px;">${isZh ? '退款金额' : 'Refund amount'}</td>
        <td style="padding:10px 0;font-weight:bold;font-size:18px;color:#111;">${centsToDollars(refundAmount)} USD</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;">${isZh ? '退款方式' : 'Refund method'}</td>
        <td style="padding:10px 0;color:#555;">${isZh ? '原路退回 PayPal' : 'Returned to PayPal account'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;">${isZh ? '预计到账' : 'Expected'}</td>
        <td style="padding:10px 0;color:#555;">${isZh ? '3-5 个工作日' : '3-5 business days'}</td>
      </tr>
    </table>

    <p style="color:#555;font-size:14px;margin-top:20px;line-height:1.6;">
      ${
        isZh
          ? '退款将退回您的 PayPal 账户。如使用信用卡通过 PayPal 付款，退款将退回到您的信用卡。'
          : 'The refund will return to your PayPal account. If you paid via credit card through PayPal, the refund will appear on your card statement.'
      }
    </p>

    <p style="color:#999;font-size:12px;margin-top:32px;text-align:center;border-top:1px solid #eee;padding-top:20px;">
      ${isZh ? '如有疑问请联系' : 'Questions?'} <a href="mailto:support@critical.bike" style="color:#00A3CC;">support@critical.bike</a>
    </p>`

  try {
    await tx.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: order.email,
      subject,
      html: emailShell(subject, body),
    })
    logger.info({ orderNo: order.orderNo }, 'Refund email sent')
  } catch (err) {
    logger.error({ err, orderNo: order.orderNo }, 'Failed to send refund email')
  }
}
