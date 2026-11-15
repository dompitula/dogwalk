import type { Payload, PayloadRequest } from 'payload'
import type { InlineAttachment } from './booking-email'

export async function sendEmail(payload: Payload, to: string, subject: string, text: string, rich?: { html: string; attachments: InlineAttachment[] }, req?: PayloadRequest) {
  return deliverEmail(payload, { to: [to], subject, text, ...(rich ? { html: rich.html, attachments: rich.attachments } : {}) }, req)
}

export type ResendMessage = {
  to: string[]
  subject: string
  text?: string
  html?: string
  cc?: string[]
  bcc?: string[]
  reply_to?: string[]
  attachments?: InlineAttachment[]
}

/** Load credentials only when sending, after the database is ready. */
export async function deliverEmail(payload: Payload, message: ResendMessage, req?: PayloadRequest, requireEnabled = true) {
  const settings = await payload.findGlobal({ slug: 'email-settings', overrideAccess: true, req })
  if ((requireEnabled && !settings.enabled) || !settings.from) return false
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return false
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...message,
      from: settings.from,
      ...(settings.replyTo ? { reply_to: [settings.replyTo] } : {}),
    }),
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { message?: string } | null
    if (response.status === 403 && details?.message?.includes('only send testing emails')) {
      throw new Error('Resend test sender can only email the address registered on your Resend account. Use a booking with that email, or configure a verified sending domain.')
    }
    // Do not log the provider response: it can contain recipient details.
    throw new Error('Email service returned HTTP ' + response.status + '. Check the sender, API key permissions and Resend delivery logs.')
  }
  return true
}
