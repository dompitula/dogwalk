import type { CollectionAfterChangeHook } from 'payload'
import type { Booking } from '../../payload-types'
import { toID } from '../ids'
import { buildBookingEmail } from './booking-email'
import { sendEmail } from './email-settings'

// Only a transition into confirmed sends an approval. Saving notes on an already
// confirmed booking, seeding data, and other status changes do not send mail.
export const sendApprovalEmail: CollectionAfterChangeHook<Booking> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || doc.status !== 'confirmed' || previousDoc?.status === 'confirmed')
    return doc
  try {
    const slot = toID(doc.slot)
    if (slot === null) return doc
    const message = await buildBookingEmail(req.payload, slot, doc.fullName, false, 'approved', req)
    const sent = await sendEmail(
      req.payload,
      doc.email,
      message.subject,
      message.text,
      message,
      req,
    )
    if (!sent)
      req.payload.logger.warn(
        'Booking approved, but approval email was not sent: email delivery is disabled or not configured.',
      )
  } catch (error) {
    // Email outages must not undo a staff member's approval or encourage duplicate saves.
    const reason = error instanceof Error ? error.message : 'Unknown email error'
    req.payload.logger.warn('Booking approved, but approval email failed: ' + reason)
  }
  return doc
}
