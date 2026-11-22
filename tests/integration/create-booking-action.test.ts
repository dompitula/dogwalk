import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type BookingResult, createBooking } from '@/app/(frontend)/actions'
import { enableEmail, mockResend, resetEmail } from './helpers/email'
import { count, createSlot, stored } from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'

// The public booking form's server action, called with the form data a browser sends.

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
})
afterEach(async () => {
  await resetEmail()
})

const initial: BookingResult = { success: false, message: '' }

const VALID = {
  fullName: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '555-0102',
  experience: 'some',
  notes: '',
}

function form(fields: Record<string, string | undefined>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) data.set(name, value)
  }
  return data
}

const book = (slot: number | string | undefined, fields: Record<string, string> = {}) =>
  createBooking(
    initial,
    form({ ...VALID, ...fields, slot: slot === undefined ? undefined : String(slot) }),
  )

const TAKEN = 'Someone just booked that walk. Please choose another available time.'

describe('createBooking', () => {
  it('returns a message for each invalid field, echoes the values and saves nothing', async () => {
    const slot = await createSlot()
    const result = await book(slot.id, {
      fullName: ' M ',
      email: ' NOT-AN-EMAIL ',
      phone: '123',
      experience: 'expert',
      notes: 'n'.repeat(501),
    })

    expect(result).toMatchObject({
      success: false,
      message: 'Please check the highlighted fields.',
      slot: String(slot.id),
      errors: {
        fullName: 'Enter your full name.',
        email: 'Enter a valid email address.',
        phone: 'Enter a valid phone number.',
        experience: 'Tell us about your dog walking experience.',
        notes: 'Keep notes under 500 characters.',
      },
      values: {
        fullName: 'M',
        email: 'not-an-email',
        phone: '123',
        experience: 'expert',
        notes: 'n'.repeat(501),
      },
    })
    expect(await count('bookings')).toBe(0)
    expect((await stored('walk-slots', slot.id)).status).toBe('available')
  })

  it.each([
    ['missing', undefined],
    ['not a number', 'abc'],
  ])('asks for a walk when the walk is %s', async (_case, slot) => {
    const result = await book(slot)
    expect(result.success).toBe(false)
    expect(result.errors).toEqual({ slot: 'Choose a walk to continue.' })
    expect(await count('bookings')).toBe(0)
  })

  it('trims and lowercases the email address', async () => {
    const slot = await createSlot()
    await book(slot.id, { email: '  Maya.Chen@Example.COM  ' })
    const { docs } = await payload.find({ collection: 'bookings', overrideAccess: true })
    expect(docs.map((booking) => booking.email)).toEqual(['maya.chen@example.com'])
  })

  it('books the walk and thanks the visitor by first name', async () => {
    const slot = await createSlot()
    const result = await book(slot.id)

    expect(result.success).toBe(true)
    expect(result.firstName).toBe('Maya')
    expect(result.message).toContain('Thanks, Maya!')
    // Email is not configured, so nothing was sent; the booking is saved all the same.
    expect(result.emailSent).toBe(false)
    expect(result.message).toContain('we could not send the confirmation email')
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
    expect(await count('bookings')).toBe(1)
  })

  it('sends the visitor a confirmation with the dog photo when email is on', async () => {
    await enableEmail()
    const sent = mockResend()
    const slot = await createSlot()

    const result = await book(slot.id)

    expect(result.emailSent).toBe(true)
    expect(sent).toHaveLength(1)
    expect(sent[0].body).toMatchObject({
      to: ['maya.chen@example.com'],
      from: 'The Good Walk <walks@example.org>',
      reply_to: ['shelter@example.org'],
      subject: 'Your walk request with Milo is in!',
    })
    expect(sent[0].body.attachments?.map((item) => item.content_id)).toEqual([
      'brand-paw',
      'walk-dog',
    ])
  })

  it('tells the visitor when someone else already booked the walk', async () => {
    const slot = await createSlot({ status: 'booked' })
    const result = await book(slot.id)
    expect(result).toMatchObject({ success: false, message: TAKEN, values: VALID })
    expect(await count('bookings')).toBe(0)
  })

  it('asks the visitor to choose another time when the walk was removed meanwhile', async () => {
    const slot = await createSlot()
    await payload.delete({ collection: 'walk-slots', id: slot.id, overrideAccess: true })

    const result = await book(slot.id)

    expect(result).toMatchObject({ success: false, message: TAKEN, values: VALID })
    expect(await count('bookings')).toBe(0)
  })

  it('books a walk only once when two visitors book it at the same time', async () => {
    const slot = await createSlot()

    const results = await Promise.all([
      book(slot.id),
      book(slot.id, { fullName: 'Alex Morgan', email: 'alex@example.com' }),
    ])

    expect(results.filter((result) => result.success)).toHaveLength(1)
    expect(results.find((result) => !result.success)?.message).toBe(TAKEN)
    expect(await count('bookings')).toBe(1)
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
  })
})
