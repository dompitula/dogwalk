import type { Validate } from 'payload'
import { describe, expect, it } from 'vitest'
import {
  type BookingInput,
  EXPERIENCE_OPTIONS,
  bookingErrors,
  experienceLabel,
  validateBookingField,
} from '@/lib/booking-rules'

const valid: BookingInput = {
  fullName: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '555-0102',
  experience: 'some',
  notes: '',
}

const errorsFor = (changes: Partial<BookingInput>) => bookingErrors({ ...valid, ...changes })

describe('bookingErrors', () => {
  it('accepts a valid booking', () => {
    expect(bookingErrors(valid)).toEqual({})
  })

  it.each([
    [1, false],
    [2, true],
    [100, true],
    [101, false],
  ])('fullName of %i characters: valid = %s', (length, ok) => {
    expect(errorsFor({ fullName: 'a'.repeat(length) }).fullName).toBe(
      ok ? undefined : 'Enter your full name.',
    )
  })

  it('trims values before measuring them', () => {
    expect(errorsFor({ fullName: '  a  ' }).fullName).toBe('Enter your full name.')
    expect(errorsFor({ fullName: '  ab  ' }).fullName).toBeUndefined()
    expect(errorsFor({ phone: `  ${'1'.repeat(6)}  ` }).phone).toBe('Enter a valid phone number.')
    expect(errorsFor({ email: '  maya@example.com  ' }).email).toBeUndefined()
  })

  it.each(['a@b.co', 'first.last+tag@sub.example.org'])('accepts the email %j', (email) => {
    expect(errorsFor({ email }).email).toBeUndefined()
  })

  it.each(['', 'maya', 'maya@example', 'maya@@example.com', 'maya chen@example.com', '@x.com'])(
    'rejects the email %j',
    (email) => {
      expect(errorsFor({ email }).email).toBe('Enter a valid email address.')
    },
  )

  it('allows emails of up to 150 characters', () => {
    const domain = '@example.com'
    expect(errorsFor({ email: 'a'.repeat(150 - domain.length) + domain }).email).toBeUndefined()
    expect(errorsFor({ email: 'a'.repeat(151 - domain.length) + domain }).email).toBe(
      'Enter a valid email address.',
    )
  })

  it.each([
    [6, false],
    [7, true],
    [40, true],
    [41, false],
  ])('phone of %i characters: valid = %s', (length, ok) => {
    expect(errorsFor({ phone: '5'.repeat(length) }).phone).toBe(
      ok ? undefined : 'Enter a valid phone number.',
    )
  })

  it.each(EXPERIENCE_OPTIONS.map((option) => option.value))('accepts experience %j', (value) => {
    expect(errorsFor({ experience: value }).experience).toBeUndefined()
  })

  it('rejects an unknown experience value', () => {
    expect(errorsFor({ experience: 'expert' }).experience).toBe(
      'Tell us about your dog walking experience.',
    )
  })

  it('allows notes of up to 500 characters', () => {
    expect(errorsFor({ notes: 'n'.repeat(500) }).notes).toBeUndefined()
    expect(errorsFor({ notes: 'n'.repeat(501) }).notes).toBe('Keep notes under 500 characters.')
  })

  it('reports every field except notes when everything is empty', () => {
    const errors = bookingErrors({ fullName: '', email: '', phone: '', experience: '', notes: '' })
    expect(Object.keys(errors).toSorted()).toEqual(['email', 'experience', 'fullName', 'phone'])
  })
})

describe('validateBookingField', () => {
  type Options = Parameters<Validate>[1]
  const run = (
    field: Parameters<typeof validateBookingField>[0],
    value: unknown,
    options: Partial<Options>,
  ) => validateBookingField(field)(value, options as Options)

  it('returns the message for an invalid value on create', () => {
    expect(run('email', 'not-an-email', { operation: 'create' })).toBe(
      'Enter a valid email address.',
    )
  })

  it('accepts a valid value on create', () => {
    expect(run('email', 'maya@example.com', { operation: 'create' })).toBe(true)
  })

  it('keeps an unchanged legacy value on update, even when it is invalid', () => {
    expect(run('phone', '123', { operation: 'update', previousValue: '123' })).toBe(true)
  })

  it('rejects a changed, invalid value on update', () => {
    expect(run('phone', '1234', { operation: 'update', previousValue: '123' })).toBe(
      'Enter a valid phone number.',
    )
  })

  it('treats a value that is not a string as empty', () => {
    expect(run('fullName', 42, { operation: 'create' })).toBe('Enter your full name.')
    expect(run('fullName', undefined, { operation: 'create' })).toBe('Enter your full name.')
    expect(run('notes', undefined, { operation: 'create' })).toBe(true)
  })
})

describe('experienceLabel', () => {
  it('gives the staff label of a known value', () => {
    expect(experienceLabel('first-time')).toBe('First-time walker')
  })

  it('shows an unknown value as it is', () => {
    expect(experienceLabel('legacy-value')).toBe('legacy-value')
  })
})
