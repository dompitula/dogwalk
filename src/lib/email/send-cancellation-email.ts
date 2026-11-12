import type { CollectionAfterChangeHook } from 'payload'
import type { Booking } from '../../payload-types'
import { buildBookingEmail } from './booking-email'
import { sendEmail } from './email-settings'

// Only a transition into cancelled sends an cancellation. Saving notes on an already
// cancelled booking, seeding data, and other status changes do not send mail.
export const sendCancellationEmail: CollectionAfterChangeHook<Booking> = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || doc.status !== 'cancelled' || previousDoc?.status === 'cancelled') return doc
  try {
    const slot = typeof doc.slot === 'object' ? doc.slot.id : doc.slot
    const message = await buildBookingEmail(req.payload, slot, doc.fullName, false, 'cancelled', req)
    const sent = await sendEmail(req.payload, doc.email, message.subject, message.text, message, req)
    if (!sent) req.payload.logger.warn('Booking cancelled, but cancellation email was not sent: email delivery is disabled or not configured.')
  } catch (error) {
    // Email outages must not undo a staff member's cancellation or encourage duplicate saves.
    const reason = error instanceof Error ? error.message : 'Unknown email error'
    req.payload.logger.warn('Booking cancelled, but cancellation email failed: ' + reason)
  }
  return doc
}
