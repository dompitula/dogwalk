'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

export type BookingResult = {
  success: boolean
  message: string
  errors?: Record<string, string>
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '')

export async function createBooking(
  _previous: BookingResult,
  formData: FormData,
): Promise<BookingResult> {
  const slot = text(formData.get('slot'))
  const fullName = text(formData.get('fullName'))
  const email = text(formData.get('email')).toLowerCase()
  const phone = text(formData.get('phone'))
  const experience = text(formData.get('experience'))
  const notes = text(formData.get('notes'))
  const errors: Record<string, string> = {}

  if (!slot) errors.slot = 'Choose a walk to continue.'
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
    return { success: false, message: 'Please check the highlighted fields.', errors }
  }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'bookings',
      overrideAccess: false,
      draft: false,
      data: {
        // The local SQLite database uses numeric IDs; the form sends them as text.
        slot: /^\d+$/.test(slot) ? Number(slot) : slot,
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
      message: `You're booked, ${fullName.split(' ')[0]}. The shelter will email you with arrival details.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return {
      success: false,
      message:
        message.includes('no longer available') || message.includes('unique')
          ? 'Someone just booked that walk. Please choose another available time.'
          : 'We could not save your booking. Please try again.',
    }
  }
}
