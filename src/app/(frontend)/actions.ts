'use server'

import { buildBookingEmail } from '@/lib/email/booking-email'
import { sendEmail } from '@/lib/email/email-settings'
import config from '@payload-config'
import { getPayload } from 'payload'
import { type BookingInput, type ExperienceValue, bookingErrors } from '@/lib/booking-rules'
import { toID } from '@/lib/ids'

export type BookingValues = BookingInput

export type BookingResult = {
  emailSent?: boolean
  firstName?: string
  success: boolean
  message: string
  /** The walk this result belongs to, so its message only shows on that walk's form. */
  slot?: string
  errors?: Record<string, string>
  /** What the visitor typed, so the form for another walk starts filled in. */
  values?: BookingValues
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '')

export async function createBooking(
  _previous: BookingResult,
  formData: FormData,
): Promise<BookingResult> {
  const slot = text(formData.get('slot'))
  const values: BookingValues = {
    fullName: text(formData.get('fullName')),
    email: text(formData.get('email')).toLowerCase(),
    phone: text(formData.get('phone')),
    experience: text(formData.get('experience')),
    notes: text(formData.get('notes')),
  }
  const { fullName, email, phone, experience, notes } = values
  // The same rules as the Bookings collection, checked here first so each field gets its message.
  const errors: Record<string, string> = bookingErrors(values)
  const slotID = toID(slot)
  if (slotID === null) errors.slot = 'Choose a walk to continue.'

  if (slotID === null || Object.keys(errors).length) {
    return { success: false, message: 'Please check the highlighted fields.', slot, errors, values }
  }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'bookings',
      overrideAccess: false,
      draft: false,
      data: {
        slot: slotID,
        fullName,
        email,
        phone,
        experience: experience as ExperienceValue,
        notes: notes || undefined,
        status: 'pending',
      },
    })

    let emailSent = false
    try {
      const message = await buildBookingEmail(payload, Number(slot), fullName)
      emailSent = await sendEmail(payload, email, message.subject, message.text, message)
    } catch {
      console.warn('Booking saved, but confirmation email could not be sent.')
    }

    return {
      success: true,
      emailSent,
      firstName: fullName.split(' ')[0],
      slot,
      message: `Thanks, ${fullName.split(' ')[0]}! Your walk is requested. ${emailSent ? 'A confirmation email has been sent. Check your inbox and spam folder.' : 'Your request is saved, but we could not send the confirmation email. You do not need to book again.'} The shelter will contact you to confirm it.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return {
      success: false,
      slot,
      values,
      message:
        message.includes('no longer available') || message.includes('unique')
          ? 'Someone just booked that walk. Please choose another available time.'
          : 'We could not save your booking. Please try again.',
    }
  }
}
