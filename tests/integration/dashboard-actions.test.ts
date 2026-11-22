import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createWalk, removeWalk, setWalkStatus } from '@/app/(dashboard)/dashboard/actions'
import type { CreateWalkInput } from '@/app/(dashboard)/dashboard/types'
import type { WalkStatus } from '@/lib/walks'
import type { Dog } from '@/payload-types'
import {
  count,
  createBookingDoc,
  createDog,
  createSlot,
  createStaff,
  stored,
} from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'
import { currentHeaders, signInAs } from './helpers/session'

// The staff dashboard's server actions, with the session read from the request headers.

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
  await signInAs(await createStaff())
})

const SIGNED_OUT = {
  ok: false,
  message: 'Your session has expired. Please sign in again.',
  signedOut: true,
}

const walkInput = (dog: Dog, changes: Partial<CreateWalkInput> = {}): CreateWalkInput => ({
  dogId: String(dog.id),
  startsAt: '2026-12-01T09:00:00.000Z',
  localLabel: '2026-12-01 10:00',
  durationMinutes: 45,
  route: 'quiet-garden',
  handlingNotes: '  Keep to flat paths.  ',
  ...changes,
})

const bookingsOf = async (slotId: number) =>
  (
    await payload.find({
      collection: 'bookings',
      where: { slot: { equals: slotId } },
      overrideAccess: true,
    })
  ).docs

describe('signed out', () => {
  it('every action returns the signed-out result and changes nothing', async () => {
    const dog = await createDog()
    const slot = await createSlot({ dog })
    await createBookingDoc({ slot })
    await signInAs(null)

    expect(await createWalk(walkInput(dog))).toEqual(SIGNED_OUT)
    expect(await setWalkStatus(String(slot.id), 'Cancelled')).toEqual(SIGNED_OUT)
    expect(await removeWalk(String(slot.id))).toEqual(SIGNED_OUT)

    expect(await count('walk-slots')).toBe(1)
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
    expect(await bookingsOf(slot.id)).toHaveLength(1)
  })

  it('rejects a forged session token', async () => {
    const dog = await createDog()
    await signInAs(null)
    currentHeaders().set('Authorization', 'JWT not-a-real-token')

    expect(await createWalk(walkInput(dog))).toEqual(SIGNED_OUT)
    expect(await count('walk-slots')).toBe(0)
  })
})

describe('createWalk', () => {
  it.each<[string, Partial<CreateWalkInput>, string]>([
    ['a missing dog', { dogId: '' }, 'Choose a dog.'],
    ['an invalid date', { startsAt: 'next tuesday' }, 'Choose a valid date and start time.'],
    ['a duration that is not offered', { durationMinutes: 50 }, 'Choose a walk duration.'],
    ['an unknown route', { route: 'moon-walk' }, 'Choose one of the approved routes.'],
    [
      'handling notes over 500 characters',
      { handlingNotes: 'n'.repeat(501) },
      'Keep handling notes under 500 characters.',
    ],
  ])('rejects %s', async (_case, changes, message) => {
    const dog = await createDog()
    expect(await createWalk(walkInput(dog, changes))).toEqual({ ok: false, message })
    expect(await count('walk-slots')).toBe(0)
  })

  it('rejects a dog that does not exist', async () => {
    const dog = await createDog()
    expect(await createWalk(walkInput(dog, { dogId: '999999' }))).toEqual({
      ok: false,
      message: 'That dog could not be found. Refresh the page and try again.',
    })
  })

  it('rejects an inactive dog', async () => {
    const dog = await createDog({ name: 'Luna', active: false })
    expect(await createWalk(walkInput(dog))).toEqual({
      ok: false,
      message:
        'Luna is not listed on the public site. Mark the dog as active in the content manager first.',
    })
    expect(await count('walk-slots')).toBe(0)
  })

  it('schedules an open walk labelled with the dog and the local time', async () => {
    const dog = await createDog()
    expect(await createWalk(walkInput(dog))).toEqual({
      ok: true,
      message: "Milo's walk is on the schedule and open for booking.",
    })

    const { docs } = await payload.find({ collection: 'walk-slots', overrideAccess: true })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({
      label: 'Milo · 2026-12-01 10:00',
      status: 'available',
      startsAt: '2026-12-01T09:00:00.000Z',
      durationMinutes: 45,
      route: 'quiet-garden',
      handlingNotes: 'Keep to flat paths.',
    })
  })

  it('labels the walk with the UTC time when the local label is malformed', async () => {
    const dog = await createDog()
    await createWalk(walkInput(dog, { localLabel: 'tomorrow morning' }))
    const { docs } = await payload.find({ collection: 'walk-slots', overrideAccess: true })
    expect(docs[0].label).toBe('Milo · 2026-12-01 09:00')
  })
})

describe('setWalkStatus', () => {
  it('only opens or cancels a walk nobody booked', async () => {
    const slot = await createSlot()

    expect(await setWalkStatus(String(slot.id), 'Scheduled')).toEqual({
      ok: false,
      message: 'Nobody has booked this walk yet, so it can only be open or cancelled.',
    })
    expect(await setWalkStatus(String(slot.id), 'Cancelled')).toEqual({ ok: true })
    expect((await stored('walk-slots', slot.id)).status).toBe('cancelled')
    expect(await setWalkStatus(String(slot.id), 'Needs Volunteer')).toEqual({ ok: true })
    expect((await stored('walk-slots', slot.id)).status).toBe('available')
  })

  it('Needs Volunteer removes the booking and reopens the walk', async () => {
    const slot = await createSlot()
    await createBookingDoc({ slot })

    expect(await setWalkStatus(String(slot.id), 'Needs Volunteer')).toEqual({
      ok: true,
      message: "Maya Chen's booking was removed and the walk is open for booking again.",
    })
    expect(await bookingsOf(slot.id)).toHaveLength(0)
    expect((await stored('walk-slots', slot.id)).status).toBe('available')
  })

  it('Scheduled confirms the booking', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })

    expect(await setWalkStatus(String(slot.id), 'Scheduled')).toEqual({ ok: true })
    expect((await stored('bookings', booking.id)).status).toBe('confirmed')
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
  })

  it('Cancelled cancels the booking', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot })

    expect(await setWalkStatus(String(slot.id), 'Cancelled')).toEqual({ ok: true })
    expect((await stored('bookings', booking.id)).status).toBe('cancelled')
  })

  it('reinstating the booking of a cancelled walk books the walk again', async () => {
    const slot = await createSlot()
    const booking = await createBookingDoc({ slot, status: 'cancelled' })
    await payload.update({
      collection: 'walk-slots',
      id: slot.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
    })

    expect(await setWalkStatus(String(slot.id), 'Pending')).toEqual({ ok: true })
    expect((await stored('bookings', booking.id)).status).toBe('pending')
    expect((await stored('walk-slots', slot.id)).status).toBe('booked')
  })

  it.each(['Lost', ''])('rejects the unknown status %j', async (status) => {
    const slot = await createSlot()
    expect(await setWalkStatus(String(slot.id), status as WalkStatus)).toEqual({
      ok: false,
      message: 'That status change is not valid.',
    })
  })

  it('rejects a walk ID that is not a number', async () => {
    expect(await setWalkStatus('abc', 'Cancelled')).toEqual({
      ok: false,
      message: 'That status change is not valid.',
    })
  })
})

describe('removeWalk', () => {
  it('deletes the walk and its booking', async () => {
    const slot = await createSlot()
    await createBookingDoc({ slot })

    expect(await removeWalk(String(slot.id))).toEqual({
      ok: true,
      message: 'The walk was removed.',
    })
    expect(await count('walk-slots')).toBe(0)
    expect(await count('bookings')).toBe(0)
  })

  it('deletes a walk nobody booked', async () => {
    const slot = await createSlot()
    expect(await removeWalk(String(slot.id))).toEqual({
      ok: true,
      message: 'The walk was removed.',
    })
    expect(await count('walk-slots')).toBe(0)
  })
})
