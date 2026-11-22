import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { Booking, Dog, Shelter, WalkSlot } from '@/payload-types'
import { getTestPayload } from './payload'

/**
 * Test data, created with the Local API as the content manager would (overrideAccess).
 * Walk times are relative to the real clock: bookings reject walks that already started.
 */

/** A time `hours` from now (negative: in the past). */
export const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)

const unique = () => randomUUID().slice(0, 8)

export async function createStaff() {
  const payload = await getTestPayload()
  const email = `staff-${unique()}@example.org`
  const password = 'correct horse battery staple'
  const user = await payload.create({
    collection: 'admins',
    data: { email, password },
    overrideAccess: true,
  })
  return { user, email, password }
}

export async function createShelter(data: Partial<Shelter> = {}) {
  const payload = await getTestPayload()
  const name = `Test Shelter ${unique()}`
  return payload.create({
    collection: 'shelters',
    overrideAccess: true,
    data: {
      name,
      slug: name.toLowerCase().replaceAll(' ', '-'),
      neighborhood: 'Riverside',
      address: '24 Willow Lane',
      description: 'A shelter for tests.',
      active: true,
      ...data,
    },
  })
}

/** A dog with a photo: uploads the sample photo of Milo, so the file lands in MEDIA_DIR. */
export async function createDog(data: Partial<Dog> & { shelter?: number | Shelter } = {}) {
  const payload = await getTestPayload()
  const shelter = data.shelter ?? (await createShelter())
  const photo = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: 'Milo, a golden retriever' },
    filePath: path.resolve('src/seed/images/milo.jpg'),
  })
  return payload.create({
    collection: 'dogs',
    overrideAccess: true,
    data: {
      name: 'Milo',
      breed: 'Golden Retriever',
      ageLabel: 'Adult',
      size: 'large',
      energy: 'moderate',
      bio: 'A big-hearted retriever.',
      kennel: 'A-12',
      temperament: 'Friendly & social',
      active: true,
      ...data,
      shelter: typeof shelter === 'object' ? shelter.id : shelter,
      photo: photo.id,
    },
  })
}

export async function createSlot({
  startsAt = hoursFromNow(48),
  status = 'available',
  dog,
  ...data
}: Partial<Omit<WalkSlot, 'startsAt' | 'dog'>> & { startsAt?: Date; dog?: Dog } = {}) {
  const payload = await getTestPayload()
  const walkDog = dog ?? (await createDog())
  return payload.create({
    collection: 'walk-slots',
    overrideAccess: true,
    data: {
      label: `${walkDog.name} · test walk`,
      dog: walkDog.id,
      shelter: typeof walkDog.shelter === 'object' ? walkDog.shelter.id : walkDog.shelter,
      startsAt: startsAt.toISOString(),
      durationMinutes: 45,
      route: 'riverside-loop',
      handlingNotes: 'Use the front-clip harness.',
      status,
      ...data,
    },
  })
}

export const BOOKING_DETAILS = {
  fullName: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '555-0102',
  experience: 'some',
} as const

export async function createBookingDoc({
  slot,
  ...data
}: Partial<Omit<Booking, 'slot'>> & { slot: number | WalkSlot }) {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'bookings',
    overrideAccess: true,
    data: {
      ...BOOKING_DETAILS,
      status: 'pending',
      ...data,
      slot: typeof slot === 'object' ? slot.id : slot,
    },
  })
}

/** A document as stored, read past access control. */
export async function stored<T extends 'bookings' | 'walk-slots'>(collection: T, id: number) {
  const payload = await getTestPayload()
  return payload.findByID({ collection, id, depth: 0, overrideAccess: true })
}

export async function count(collection: 'bookings' | 'walk-slots' | 'dogs' | 'media') {
  const payload = await getTestPayload()
  const { totalDocs } = await payload.count({ collection, overrideAccess: true })
  return totalDocs
}
