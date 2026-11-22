import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { MEDIA_DIR } from '@/lib/media-dir'
import { seedStarterData } from '@/seed/index'
import { count } from './helpers/fixtures'
import { requests, respondTo } from './helpers/network'
import { getTestPayload } from './helpers/payload'

// The sample data added to an empty database when Payload starts (onInit). Payload starts
// here, in beforeAll, so SAMPLE_DATA (read when the seed runs) is set first.

let payload: Payload
const photoDownloads: string[] = []

beforeAll(async () => {
  process.env.SAMPLE_DATA = 'true'
  // The photo download fails, so the bundled placeholder photos are used.
  respondTo('images.unsplash.com', (request) => {
    photoDownloads.push(request.url)
    return new Response('unavailable', { status: 503 })
  })
  payload = await getTestPayload()
})

describe('seedStarterData', () => {
  it('adds a shelter, 3 dogs with the placeholder photos, 10 walks and 3 bookings', async () => {
    expect(photoDownloads).toHaveLength(3)
    expect(requests().every((request) => request.handled)).toBe(true)

    const [shelters, admins] = await Promise.all([
      payload.count({ collection: 'shelters', overrideAccess: true }),
      payload.count({ collection: 'admins', overrideAccess: true }),
    ])
    expect(shelters.totalDocs).toBe(1)
    expect(admins.totalDocs).toBe(0)
    expect(await count('dogs')).toBe(3)
    expect(await count('walk-slots')).toBe(10)
    expect(await count('bookings')).toBe(3)

    const { docs: photos } = await payload.find({ collection: 'media', overrideAccess: true })
    expect(photos).toHaveLength(3)
    for (const photo of photos) {
      expect(existsSync(path.join(MEDIA_DIR, photo.filename!))).toBe(true)
    }
    const { docs: dogs } = await payload.find({ collection: 'dogs', overrideAccess: true })
    expect(dogs.map((dog) => dog.name).toSorted()).toEqual(['Cooper', 'Luna', 'Milo'])
  })

  it('books exactly the 3 walks that have a demo booking, all in the future', async () => {
    const { docs: walks } = await payload.find({
      collection: 'walk-slots',
      overrideAccess: true,
      limit: 100,
    })
    expect(walks.filter((walk) => walk.status === 'booked')).toHaveLength(3)
    expect(walks.every((walk) => new Date(walk.startsAt) > new Date())).toBe(true)
  })

  it('adds nothing when it runs again', async () => {
    await seedStarterData(payload)
    // Also past the once-per-process guard: the database is no longer empty.
    delete (globalThis as { __goodWalkSeed?: unknown }).__goodWalkSeed
    await seedStarterData(payload)

    expect(await count('dogs')).toBe(3)
    expect(await count('walk-slots')).toBe(10)
    expect(await count('bookings')).toBe(3)
    expect(await count('media')).toBe(3)
  })
})
