import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableEmail, mockResend, resetEmail } from './helpers/email'
import { createBookingDoc, createSlot, stored } from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'

// The emails sent when staff change a booking's status (Bookings `afterChange` hooks).

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
})
afterEach(async () => {
  vi.restoreAllMocks()
  await resetEmail()
})

const setStatus = (id: number, status: 'confirmed' | 'cancelled' | 'checked-out') =>
  payload.update({ collection: 'bookings', id, data: { status }, overrideAccess: true })

describe('booking status emails', () => {
  it('sends one approval when a booking is confirmed', async () => {
    await enableEmail({ from: 'Riverside Walks <walks@example.org>', replyTo: 'team@example.org' })
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot() })

    await setStatus(booking.id, 'confirmed')

    expect(sent).toHaveLength(1)
    expect(sent[0].authorization).toBe('Bearer re_test_key')
    expect(sent[0].body).toMatchObject({
      to: ['maya.chen@example.com'],
      from: 'Riverside Walks <walks@example.org>',
      reply_to: ['team@example.org'],
      subject: 'Your walk with Milo is confirmed!',
    })
    expect(sent[0].body.text).toContain('Great news, Maya! Your walk is confirmed.')
  })

  it('sends nothing when a confirmed booking is saved again', async () => {
    await enableEmail()
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot(), status: 'confirmed' })

    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { notes: 'Bring a towel.' },
      overrideAccess: true,
    })
    await setStatus(booking.id, 'confirmed')

    expect(sent).toHaveLength(0)
  })

  it('sends a cancellation when a booking is cancelled', async () => {
    await enableEmail()
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot() })

    await setStatus(booking.id, 'cancelled')

    expect(sent).toHaveLength(1)
    expect(sent[0].body.subject).toBe('Your walk with Milo has been cancelled')
  })

  it('sends nothing for other status changes', async () => {
    await enableEmail()
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot(), status: 'confirmed' })

    await setStatus(booking.id, 'checked-out')

    expect(sent).toHaveLength(0)
  })

  it('keeps the status change and logs a warning when Resend fails', async () => {
    await enableEmail()
    const sent = mockResend(500)
    const warn = vi.spyOn(payload.logger, 'warn')
    const booking = await createBookingDoc({ slot: await createSlot() })

    const updated = await setStatus(booking.id, 'confirmed')

    expect(sent).toHaveLength(1)
    expect(updated.status).toBe('confirmed')
    expect((await stored('bookings', booking.id)).status).toBe('confirmed')
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^Booking approved, but approval email failed: .*HTTP 500/),
    )
  })

  it('sends nothing while email is switched off', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot() })

    await setStatus(booking.id, 'confirmed')

    expect(sent).toHaveLength(0)
  })

  it('sends nothing without RESEND_API_KEY', async () => {
    await enableEmail()
    vi.stubEnv('RESEND_API_KEY', '')
    const sent = mockResend()
    const booking = await createBookingDoc({ slot: await createSlot() })

    await setStatus(booking.id, 'confirmed')

    expect(sent).toHaveLength(0)
  })
})
