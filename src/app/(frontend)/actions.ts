'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

export type BookingValues = {
  fullName: string
  email: string
  phone: string
  experience: string
  notes: string
}

export type BookingResult = {
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
  const errors: Record<string, string> = {}

  // Walk IDs are numbers in the SQLite database; the form sends them as text.
  if (!/^\d+$/.test(slot)) errors.slot = 'Choose a walk to continue.'
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    errors.email = 'Enter a valid email address.'
  }
  if (phone.length < 7 || phone.length > 40) errors.phone = 'Enter a valid phone number.'
  if (!['first-time', 'some', 'experienced'].includes(experience)) {
    errors.experience = 'Tell us about your dog walking experience.'
  }
  if (notes.length > 500) errors.notes = 'Keep notes under 500 characters.'

  if (Object.keys(errors).length) {
    return { success: false, message: 'Please check the highlighted fields.', slot, errors, values }
  }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'bookings',
      overrideAccess: false,
      draft: false,
      data: {
        slot: Number(slot),
        fullName,
        email,
        phone,
        experience: experience as 'first-time' | 'some' | 'experienced',
        notes: notes || undefined,
        status: 'pending',
      },
    })

    return {
      success: true,
      slot,
      message: `Thanks, ${fullName.split(' ')[0]}! Your walk is requested. The shelter will contact you to confirm it.`,
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
