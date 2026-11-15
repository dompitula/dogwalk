import type { EmailAdapter, SendEmailOptions } from 'payload'
import { deliverEmail } from './email-settings'

function addresses(value: SendEmailOptions['to']): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map(item => typeof item === 'string' ? item : item.address)
}
function content(value: SendEmailOptions['html']): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  throw new Error('System email content must be text or HTML, not a stream or file.')
}

/** System emails use RESEND_API_KEY from .env and the sender saved in Email settings. */
export const payloadResendAdapter: EmailAdapter<boolean> = ({ payload }) => ({
  name: 'saved-resend-settings',
  // Payload needs defaults while initializing; deliverEmail always uses the saved sender.
  defaultFromAddress: 'onboarding@resend.dev',
  defaultFromName: 'The Good Walk',
  async sendEmail(message) {
    const to = addresses(message.to)
    const cc = addresses(message.cc)
    const bcc = addresses(message.bcc)
    const replyTo = addresses(message.replyTo)
    if (!to.length && !cc.length && !bcc.length) throw new Error('System email has no recipient.')
    if (message.attachments?.length) throw new Error('System email attachments are not supported by this adapter.')
    // The toggle controls booking notifications; password recovery remains available.
    const sent = await deliverEmail(payload, {
      to,
      subject: message.subject || 'The Good Walk',
      text: content(message.text),
      html: content(message.html),
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      ...(replyTo.length ? { reply_to: replyTo } : {}),
    }, undefined, false)
    if (!sent) throw new Error('Email is not configured. Set RESEND_API_KEY in .env, restart the app and save a sender in Dashboard > Email settings.')
    return true
  },
})
