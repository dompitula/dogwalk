import type { Validate } from 'payload'

/**
 * What a booking must contain. The public booking form checks a visitor's input with
 * `bookingErrors`, and the Bookings collection checks every save (public site, dashboard,
 * content manager) with `validateBookingField`: one set of rules for both. Keep this file
 * free of server-only imports, as the booking form and the dashboard use it too.
 */

export const EXPERIENCE_OPTIONS = [
  { value: 'first-time', label: 'First-time walker', visitorLabel: 'This is my first time' },
  { value: 'some', label: 'Some experience', visitorLabel: 'I have some experience' },
  { value: 'experienced', label: 'Experienced walker', visitorLabel: 'I’m an experienced walker' },
] as const

export type ExperienceValue = (typeof EXPERIENCE_OPTIONS)[number]['value']

/** The staff-facing label for a stored experience value. */
export const experienceLabel = (value: string) =>
  EXPERIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value

export const BOOKING_LIMITS = {
  fullName: { min: 2, max: 100 },
  email: { max: 150 },
  phone: { min: 7, max: 40 },
  notes: { max: 500 },
} as const

export type BookingInput = {
  fullName: string
  email: string
  phone: string
  experience: string
  notes: string
}

type BookingField = keyof BookingInput

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const within = (value: string, { min = 0, max }: { min?: number; max: number }) =>
  value.length >= min && value.length <= max

/** Each field's rule: the error message for a (trimmed) value, or `null` when it is fine. */
const RULES: Record<BookingField, (value: string) => string | null> = {
  fullName: (value) => (within(value, BOOKING_LIMITS.fullName) ? null : 'Enter your full name.'),
  email: (value) =>
    EMAIL_PATTERN.test(value) && within(value, BOOKING_LIMITS.email)
      ? null
      : 'Enter a valid email address.',
  phone: (value) => (within(value, BOOKING_LIMITS.phone) ? null : 'Enter a valid phone number.'),
  experience: (value) =>
    EXPERIENCE_OPTIONS.some((option) => option.value === value)
      ? null
      : 'Tell us about your dog walking experience.',
  notes: (value) =>
    within(value, BOOKING_LIMITS.notes)
      ? null
      : `Keep notes under ${BOOKING_LIMITS.notes.max} characters.`,
}

/** The fields that break a rule, with their messages. Empty when the booking is fine. */
export function bookingErrors(input: BookingInput): Partial<Record<BookingField, string>> {
  const errors: Partial<Record<BookingField, string>> = {}
  for (const field of Object.keys(RULES) as BookingField[]) {
    const error = RULES[field](input[field].trim())
    if (error) errors[field] = error
  }
  return errors
}

/** The same rule as a Payload field `validate` function, for the Bookings collection. */
export const validateBookingField =
  (field: BookingField): Validate =>
  (value, { operation, previousValue }) => {
    // A value saved before these rules existed must not block an unrelated change to the
    // booking, such as staff changing its status.
    if (operation === 'update' && value === previousValue) return true
    return RULES[field](typeof value === 'string' ? value.trim() : '') ?? true
  }
