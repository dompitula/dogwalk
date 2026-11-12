import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import type { InlineAttachment } from './booking-email'

function key(secret: string) {
  if (!secret) throw new Error('Application secret is missing.')
  return scryptSync(secret, 'shelterwalk-email-settings-v1', 32)
}
export function encryptEmailKey(value: string, secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join('.')
}
export function decryptEmailKey(value: string, secret: string) {
  const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key(secret), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
export async function sendEmail(payload: Payload, to: string, subject: string, text: string, rich?: { html: string; attachments: InlineAttachment[] }, req?: PayloadRequest) {
  const settings = await payload.findGlobal({ slug: 'email-settings', overrideAccess: true, req })
  if (!settings.enabled || !settings.from || !settings.encryptedKey) return false
  const apiKey = decryptEmailKey(settings.encryptedKey, payload.secret)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: settings.from, to: [to], subject, text, ...(rich ? { html: rich.html, attachments: rich.attachments } : {}) }),
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
