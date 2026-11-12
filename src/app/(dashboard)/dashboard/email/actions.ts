'use server'
import { buildBookingEmail } from '@/lib/email/booking-email'
import { getStaffSession } from '@/lib/staff-auth'
import { encryptEmailKey, sendEmail } from '@/lib/email/email-settings'
export type EmailResult = { message: string; ok: boolean }
export async function saveEmailSettings(_state: EmailResult, form: FormData): Promise<EmailResult> {
  const { payload, user } = await getStaffSession()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const from = String(form.get('from') || '').trim()
  const apiKey = String(form.get('apiKey') || '').trim()
  const timeZone = String(form.get('timeZone') || '').trim()
  const enabled = form.get('enabled') === 'on'
  if (from.length > 254 || apiKey.length > 256 || timeZone.length > 100) return { ok: false, message: 'One of the settings is too long.' }
  const sender = from.includes('<') ? from.match(/<([^<>]+)>$/)?.[1] || '' : from
  if ((enabled || from) && (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender) || /[\r\n]/.test(from))) {
    return { ok: false, message: 'Enter a valid sender address.' }
  }
  try { new Intl.DateTimeFormat('en', { timeZone }).format() } catch {
    return { ok: false, message: 'Enter a valid time zone, such as Europe/Warsaw.' }
  }
  if (apiKey && (!apiKey.startsWith('re_') || /\s/.test(apiKey))) return { ok: false, message: 'Enter a valid Resend API key.' }
  try {
    const previous = await payload.findGlobal({ slug: 'email-settings', overrideAccess: true })
    if (enabled && !apiKey && !previous.encryptedKey) return { ok: false, message: 'Enter your Resend API key before enabling emails.' }
    await payload.updateGlobal({ slug: 'email-settings', overrideAccess: true, data: {
      enabled, from, timeZone,
      ...(apiKey ? { encryptedKey: encryptEmailKey(apiKey, payload.secret) } : {}),
    } })
    return { ok: true, message: 'Email settings saved. They apply immediately.' }
  } catch { return { ok: false, message: 'Settings could not be saved. Please try again.' } }
}
export async function sendTestEmail(_state: EmailResult, _form: FormData): Promise<EmailResult> {
  const { payload, user } = await getStaffSession()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  try {
    const { docs } = await payload.find({ collection: 'walk-slots', limit: 1, sort: '-startsAt', overrideAccess: false, user })
    if (!docs.length) return { ok: false, message: 'Add a walk first to preview a confirmation with a dog photo.' }
    const message = await buildBookingEmail(payload, docs[0].id, 'friend', true)
    const sent = await sendEmail(payload, user.email, message.subject, message.text, message)
    return sent ? { ok: true, message: 'Test email accepted for sending. Check your inbox and spam folder.' } : { ok: false, message: 'Save and enable your email settings first.' }
  } catch { return { ok: false, message: 'Test email failed. Check your Resend key and verified sender address.' } }
}
