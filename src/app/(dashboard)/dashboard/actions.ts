'use server'

import { getStaffSession } from '@/lib/staff-auth'
import {
  BOOKING_STATUS_FOR_WALK_STATUS,
  WALK_DURATIONS,
  WALK_ROUTES,
  WALK_STATUSES,
  type WalkRouteValue,
  type WalkStatus,
} from '@/lib/walks'
import type { ActionResult, CreateWalkInput } from './types'

// Every action re-checks the staff session: server actions are reachable by anyone who
// can load the page, so the UI being hidden is not enough.

const SIGNED_OUT: ActionResult = {
  ok: false,
  message: 'Your session has expired. Please sign in again.',
  signedOut: true,
}

/** SQLite uses numeric IDs; the browser sends them back as strings. */
const toID = (value: string) => (/^\d+$/.test(value) ? Number(value) : value)

const relationID = (value: unknown) =>
  value && typeof value === 'object' && 'id' in value
    ? (value as { id: string | number }).id
    : (value as string | number)

const failure = (error: unknown, fallback: string): ActionResult => ({
  ok: false,
  message: error instanceof Error && error.message ? error.message : fallback,
})

export async function createWalk(input: CreateWalkInput): Promise<ActionResult> {
  const { payload, user } = await getStaffSession()
  if (!user) return SIGNED_OUT

  const dogId = typeof input?.dogId === 'string' ? input.dogId.trim() : ''
  const startsAt = new Date(typeof input?.startsAt === 'string' ? input.startsAt : '')
  const localLabel = typeof input?.localLabel === 'string' ? input.localLabel.trim() : ''
  const durationMinutes = Number(input?.durationMinutes)
  const route = typeof input?.route === 'string' ? input.route : ''
  const handlingNotes = typeof input?.handlingNotes === 'string' ? input.handlingNotes.trim() : ''

  if (!dogId) return { ok: false, message: 'Choose a dog.' }
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, message: 'Choose a valid date and start time.' }
  }
  if (!(WALK_DURATIONS as readonly number[]).includes(durationMinutes)) {
    return { ok: false, message: 'Choose a walk duration.' }
  }
  if (route && !WALK_ROUTES.some((item) => item.value === route)) {
    return { ok: false, message: 'Choose one of the approved routes.' }
  }
  if (handlingNotes.length > 500) {
    return { ok: false, message: 'Keep handling notes under 500 characters.' }
  }

  let dog
  try {
    dog = await payload.findByID({
      collection: 'dogs',
      id: toID(dogId),
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false, message: 'That dog could not be found. Refresh the page and try again.' }
  }

  if (!dog.active) {
    return {
      ok: false,
      message: `${dog.name} is not listed on the public site. Mark the dog as active in the content manager first.`,
    }
  }

  const when = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(localLabel)
    ? localLabel
    : startsAt.toISOString().slice(0, 16).replace('T', ' ')

  try {
    await payload.create({
      collection: 'walk-slots',
      overrideAccess: false,
      user,
      data: {
        label: `${dog.name} · ${when}`,
        dog: dog.id,
        shelter: relationID(dog.shelter),
        startsAt: startsAt.toISOString(),
        durationMinutes,
        route: route ? (route as WalkRouteValue) : undefined,
        handlingNotes: handlingNotes || undefined,
        status: 'available',
      },
    })
  } catch (error) {
    return failure(error, 'The walk could not be saved. Please try again.')
  }

  return { ok: true, message: `${dog.name}'s walk is on the schedule and open for booking.` }
}

export async function setWalkStatus(walkId: string, status: WalkStatus): Promise<ActionResult> {
  const { payload, user } = await getStaffSession()
  if (!user) return SIGNED_OUT

  if (typeof walkId !== 'string' || !walkId || !WALK_STATUSES.includes(status)) {
    return { ok: false, message: 'That status change is not valid.' }
  }

  try {
    const slot = await payload.findByID({
      collection: 'walk-slots',
      id: toID(walkId),
      depth: 0,
      overrideAccess: false,
      user,
    })
    const { docs } = await payload.find({
      collection: 'bookings',
      where: { slot: { equals: slot.id } },
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
    })
    const booking = docs[0]

    if (!booking) {
      if (status !== 'Needs Volunteer' && status !== 'Cancelled') {
        return {
          ok: false,
          message: 'Nobody has booked this walk yet, so it can only be open or cancelled.',
        }
      }
      await payload.update({
        collection: 'walk-slots',
        id: slot.id,
        data: { status: status === 'Cancelled' ? 'cancelled' : 'available' },
        overrideAccess: false,
        user,
      })
      return { ok: true }
    }

    if (status === 'Needs Volunteer') {
      // Release the walk: remove the booking and reopen the walk for public booking.
      await payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: false, user })
      await payload.update({
        collection: 'walk-slots',
        id: slot.id,
        data: { status: 'available' },
        overrideAccess: false,
        user,
      })
      return {
        ok: true,
        message: `${booking.fullName}'s booking was removed and the walk is open for booking again.`,
      }
    }

    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { status: BOOKING_STATUS_FOR_WALK_STATUS[status] },
      overrideAccess: false,
      user,
    })

    // A booked walk must not stay cancelled (or bookable) once staff reinstate the booking.
    if (status !== 'Cancelled' && slot.status !== 'booked') {
      await payload.update({
        collection: 'walk-slots',
        id: slot.id,
        data: { status: 'booked' },
        overrideAccess: false,
        user,
      })
    }

    return { ok: true }
  } catch (error) {
    return failure(error, 'The status could not be changed. Please try again.')
  }
}

export async function removeWalk(walkId: string): Promise<ActionResult> {
  const { payload, user } = await getStaffSession()
  if (!user) return SIGNED_OUT

  if (typeof walkId !== 'string' || !walkId) {
    return { ok: false, message: 'That walk could not be found.' }
  }

  try {
    const slot = await payload.findByID({
      collection: 'walk-slots',
      id: toID(walkId),
      depth: 0,
      overrideAccess: false,
      user,
    })
    const { docs } = await payload.find({
      collection: 'bookings',
      where: { slot: { equals: slot.id } },
      depth: 0,
      overrideAccess: false,
      user,
    })

    // Bookings first: a walk that still has a booking cannot be deleted.
    for (const booking of docs) {
      await payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: false, user })
    }
    await payload.delete({ collection: 'walk-slots', id: slot.id, overrideAccess: false, user })
  } catch (error) {
    return failure(error, 'The walk could not be removed. Please try again.')
  }

  return { ok: true, message: 'The walk was removed.' }
}
