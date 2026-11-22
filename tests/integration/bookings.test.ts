import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Booking } from '@/payload-types'
import {
  BOOKING_DETAILS,
  createBookingDoc,
  createSlot,
  hoursFromNow,
  stored,
} from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'

// The Bookings collection as the public site uses it: the Local API without a user and
// with access control on (overrideAccess: false).

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
})

const NO_LONGER_AVAILABLE = 'That walk is no longer available. Please choose another time.'

type PublicBooking = Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'slot'>> & {
  slot: number
}

// As the public booking form saves it (src/app/(frontend)/actions.ts).
const publicCreate = (data: PublicBooking) =>
  payload.create({
    collection: 'bookings',
    overrideAccess: false,
    draft: false,
    // The form always sends `pending`; the tests that send another status check it is ignored.
    data: { ...BOOKING_DETAILS, status: 'pending', ...data },
  })

describe('booking a walk', () => {
  it('saves a booking on an open future walk as pending and books the walk', async () => {
    const slot = await createSlot()
    const booking = await publicCreate({ slot: slot.id })

    expect(booking.status).toBe('pending')
    expect((await stored('bookings', booking.id)).status).toBe('pending')
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
  })

  it('does not let the public set the status', async () => {
    const slot = await createSlot()
    const booking = await publicCreate({ slot: slot.id, status: 'confirmed' })
    expect((await stored('bookings', booking.id)).status).toBe('pending')
  })

  it.each([
    ['a booked walk', { status: 'booked' as const }],
    ['a cancelled walk', { status: 'cancelled' as const }],
    ['a walk that started an hour ago', { startsAt: hoursFromNow(-1) }],
  ])('rejects %s', async (_case, slotData) => {
    const slot = await createSlot(slotData)
    await expect(publicCreate({ slot: slot.id })).rejects.toThrow(NO_LONGER_AVAILABLE)
    expect((await payload.count({ collection: 'bookings', overrideAccess: true })).totalDocs).toBe(
      0,
    )
  })

  it('rejects a walk that does not exist', async () => {
    await expect(publicCreate({ slot: 999_999 })).rejects.toThrow(NO_LONGER_AVAILABLE)
  })

  it('rejects a second booking of the same walk', async () => {
    const slot = await createSlot()
    await publicCreate({ slot: slot.id })
    await expect(
      publicCreate({ slot: slot.id, fullName: 'Alex Morgan', email: 'alex@example.com' }),
    ).rejects.toThrow(NO_LONGER_AVAILABLE)
    expect((await payload.count({ collection: 'bookings', overrideAccess: true })).totalDocs).toBe(
      1,
    )
  })
})

describe('booking validation', () => {
  it.each([
    ['email', { email: 'not-an-email' }, 'Enter a valid email address.'],
    ['phone', { phone: '12345' }, 'Enter a valid phone number.'],
  ])('rejects an invalid %s', async (field, data, message) => {
    const slot = await createSlot()
    const error = await publicCreate({ slot: slot.id, ...data }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ data: { errors: [{ path: field, message }] } })
    expect((await stored('walk-slots', slot.id)).status).toBe('available')
  })

  it('lets staff change the status of a booking saved before the rules existed', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })
    // Bypasses validation, like data saved by an older version of the app.
    await payload.db.updateOne({ collection: 'bookings', id: booking.id, data: { phone: '123' } })

    const updated = await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { status: 'checked-out' },
      overrideAccess: true,
    })

    expect(updated.status).toBe('checked-out')
    expect(updated.phone).toBe('123')
  })
})

describe('deleting a booking', () => {
  it('reopens a booked walk', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')

    await payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: true })

    expect((await stored('walk-slots', slot.id)).status).toBe('available')
  })

  it('leaves a cancelled walk cancelled', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })
    await payload.update({
      collection: 'walk-slots',
      id: slot.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
    })

    await payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: true })

    expect((await stored('walk-slots', slot.id)).status).toBe('cancelled')
  })
})

describe('deleting a walk', () => {
  it('is refused while the walk has a booking, and allowed once it is deleted', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })

    await expect(
      payload.delete({ collection: 'walk-slots', id: slot.id, overrideAccess: true }),
    ).rejects.toThrow('This walk has a booking. Delete the booking first, then the walk.')

    await payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: true })
    await payload.delete({ collection: 'walk-slots', id: slot.id, overrideAccess: true })

    expect(
      (await payload.count({ collection: 'walk-slots', overrideAccess: true })).totalDocs,
    ).toBe(0)
  })
})
