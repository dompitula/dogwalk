import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { findAvailableWalks } from '@/lib/available-walks'
import { createDog, createShelter, createSlot, hoursFromNow } from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'

// The walks the public home page lists.

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
})

describe('findAvailableWalks', () => {
  it('lists only open, future walks of active dogs at active shelters, soonest first', async () => {
    const shelter = await createShelter({ name: 'Riverside Animal Shelter' })
    const milo = await createDog({ shelter })
    const inactiveDog = await createDog({ name: 'Luna', shelter, active: false })
    const closedShelterDog = await createDog({
      name: 'Cooper',
      shelter: await createShelter({ active: false }),
    })

    const later = await createSlot({ dog: milo, startsAt: hoursFromNow(48) })
    const sooner = await createSlot({ dog: milo, startsAt: hoursFromNow(24) })
    await createSlot({ dog: milo, status: 'booked' })
    await createSlot({ dog: milo, status: 'cancelled' })
    await createSlot({ dog: milo, startsAt: hoursFromNow(-1) })
    await createSlot({ dog: inactiveDog })
    await createSlot({ dog: closedShelterDog })

    const walks = await findAvailableWalks(payload)

    expect(walks.map((walk) => walk.id)).toEqual([String(sooner.id), String(later.id)])
    expect(walks[0]).toMatchObject({
      startsAt: sooner.startsAt,
      durationMinutes: 45,
      dog: {
        name: 'Milo',
        breed: 'Golden Retriever',
        traits: [],
        photo: { alt: 'Milo, a golden retriever' },
      },
      shelter: { name: 'Riverside Animal Shelter', neighborhood: 'Riverside' },
    })
    expect(walks[0].dog.photo.url).toMatch(/^\/api\/media\/file\//)
  })

  it('never includes staff-only details', async () => {
    await createSlot()
    const [walk] = await findAvailableWalks(payload)
    expect(JSON.stringify(walk)).not.toMatch(/route|handlingNotes|riverside-loop|front-clip/i)
  })

  it('lists the walks after `now`', async () => {
    const dog = await createDog()
    await createSlot({ dog, startsAt: hoursFromNow(24) })
    const later = await createSlot({ dog, startsAt: hoursFromNow(48) })

    const walks = await findAvailableWalks(payload, hoursFromNow(30))

    expect(walks.map((walk) => walk.id)).toEqual([String(later.id)])
  })

  it('returns at most 24 walks', async () => {
    const dog = await createDog()
    for (let hour = 1; hour <= 26; hour++) {
      await createSlot({ dog, startsAt: hoursFromNow(hour * 2) })
    }

    const walks = await findAvailableWalks(payload)

    expect(walks).toHaveLength(24)
    const starts = walks.map((walk) => walk.startsAt)
    expect(starts).toEqual(starts.toSorted())
  })
})
