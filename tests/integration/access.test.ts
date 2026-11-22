import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createBookingDoc, createDog, createSlot, createStaff } from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'

// What visitors (no user) and staff can read and change, through the Local API with access
// control on, as the public site and the REST API use it.

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
})

const FORBIDDEN = 'You are not allowed to perform this action.'

describe('bookings', () => {
  it('cannot be listed or read by visitors', async () => {
    const booking = await createBookingDoc({ slot: await createSlot() })
    await expect(payload.find({ collection: 'bookings', overrideAccess: false })).rejects.toThrow(
      FORBIDDEN,
    )
    await expect(
      payload.findByID({ collection: 'bookings', id: booking.id, overrideAccess: false }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('cannot be changed or deleted by visitors', async () => {
    const booking = await createBookingDoc({ slot: await createSlot() })
    await expect(
      payload.update({
        collection: 'bookings',
        id: booking.id,
        data: { status: 'confirmed' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
    await expect(
      payload.delete({ collection: 'bookings', id: booking.id, overrideAccess: false }),
    ).rejects.toThrow(FORBIDDEN)
  })

  it('can be listed by staff', async () => {
    await createBookingDoc({ slot: await createSlot() })
    const { user } = await createStaff()
    const { totalDocs } = await payload.find({
      collection: 'bookings',
      overrideAccess: false,
      user,
    })
    expect(totalDocs).toBe(1)
  })
})

describe('walk slots', () => {
  it('hide the route and handling notes from visitors', async () => {
    await createSlot()
    const { docs } = await payload.find({ collection: 'walk-slots', overrideAccess: false })
    expect(docs).toHaveLength(1)
    expect(docs[0]).not.toHaveProperty('route')
    expect(docs[0]).not.toHaveProperty('handlingNotes')
  })

  it('show the route and handling notes to staff', async () => {
    await createSlot()
    const { user } = await createStaff()
    const { docs } = await payload.find({ collection: 'walk-slots', overrideAccess: false, user })
    expect(docs[0]).toMatchObject({
      route: 'riverside-loop',
      handlingNotes: 'Use the front-clip harness.',
    })
  })
})

describe('dogs', () => {
  it('hide the staff notes from visitors', async () => {
    await createDog({ specialCare: ['Short walks only'], careNotes: 'Medication at noon.' })
    const { docs } = await payload.find({ collection: 'dogs', overrideAccess: false })
    expect(docs[0].name).toBe('Milo')
    for (const field of ['kennel', 'temperament', 'specialCare', 'careNotes']) {
      expect(docs[0]).not.toHaveProperty(field)
    }
  })
})

describe('staff accounts', () => {
  it('cannot be created by visitors', async () => {
    await createStaff()
    await expect(
      payload.create({
        collection: 'admins',
        data: { email: 'intruder@example.com', password: 'let me in please' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(FORBIDDEN)
    expect((await payload.count({ collection: 'admins', overrideAccess: true })).totalDocs).toBe(1)
  })

  it('cannot be listed by visitors', async () => {
    await createStaff()
    await expect(payload.find({ collection: 'admins', overrideAccess: false })).rejects.toThrow(
      FORBIDDEN,
    )
  })
})

describe('email settings', () => {
  it('cannot be read or changed through the API, even by staff', async () => {
    const { user } = await createStaff()
    await expect(
      payload.findGlobal({ slug: 'email-settings', overrideAccess: false, user }),
    ).rejects.toThrow(FORBIDDEN)
    await expect(
      payload.updateGlobal({
        slug: 'email-settings',
        data: { enabled: true },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow(FORBIDDEN)
  })
})
