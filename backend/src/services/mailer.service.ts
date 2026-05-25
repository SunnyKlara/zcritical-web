import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../config/logger'

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

/**
 * Send a notification when a new lead is submitted.
 * Fire-and-forget — failures are logged but never propagated.
 */
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
