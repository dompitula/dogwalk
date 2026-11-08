import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import type { BookingStatusValue, WalkRouteValue } from '../lib/walks'

/**
 * Starter data for a brand-new local database.
 *
 * Runs from `onInit` in payload.config.ts. It only does something when the database
 * has no staff accounts and no dogs yet, so it never touches data you created.
 * To start over, stop the server and delete `shelter.db` and the `media` folder.
 */

// `pnpm dev` runs from the project root, so the bundled placeholder photos live here.
const PLACEHOLDER_DIR = path.resolve(process.cwd(), 'src', 'seed', 'images')

type SeedDog = {
  key: 'milo' | 'luna' | 'charlie' | 'cooper'
  name: string
  breed: string
  ageLabel: string
  size: 'small' | 'medium' | 'large'
  energy: 'easygoing' | 'moderate' | 'high'
  kennel: string
  temperament: string
  bio: string
  traits: string[]
  photoURL: string
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80&fm=jpg`

const DOGS: SeedDog[] = [
  {
    key: 'milo',
    name: 'Milo',
    breed: 'Golden Retriever',
    ageLabel: '3 years',
    size: 'large',
    energy: 'moderate',
    kennel: 'A-12',
    temperament: 'Friendly & social',
    bio: 'A big-hearted retriever who greets everyone like an old friend. Happiest with a long, sniffy walk and a tennis ball.',
    traits: ['Loves people', 'Good on the lead', 'Treat motivated'],
    photoURL: unsplash('photo-1544568100-847a948585b9'),
  },
  {
    key: 'luna',
    name: 'Luna',
    breed: 'Mini Dachshund',
    ageLabel: '2 years',
    size: 'small',
    energy: 'easygoing',
    kennel: 'B-04',
    temperament: 'Shy at first',
    bio: 'A gentle little dachshund who warms up quickly once she knows you. Loves sunny spots and slow, quiet strolls.',
    traits: ['Shy at first', 'Small & sweet', 'Quiet walks'],
    photoURL: unsplash('photo-1588170261280-c1872232a6ab'),
  },
  {
    key: 'charlie',
    name: 'Charlie',
    breed: 'Cocker Spaniel',
    ageLabel: '5 years',
    size: 'medium',
    energy: 'easygoing',
    kennel: 'A-08',
    temperament: 'Calm & gentle',
    bio: 'A calm, soft-eared spaniel who walks nicely on the lead and enjoys a good sniff around the garden.',
    traits: ['Calm', 'Great for beginners', 'Gentle'],
    photoURL: unsplash('photo-1680795082050-28f6495af899'),
  },
  {
    key: 'cooper',
    name: 'Cooper',
    breed: 'Border Collie',
    ageLabel: '2 years',
    size: 'medium',
    energy: 'high',
    kennel: 'C-02',
    temperament: 'High energy',
    bio: 'A clever, bouncy collie with energy to spare. Best with someone who enjoys a brisk pace and a few games.',
    traits: ['High energy', 'Smart', 'Loves games'],
    photoURL: unsplash('photo-1655993825358-0aa0cf38b122'),
  },
]

type SeedSlot = {
  dog: SeedDog['key']
  dayOffset: number
  time: string
  durationMinutes: number
  route: WalkRouteValue
  handlingNotes?: string
}

const SLOTS: SeedSlot[] = [
  { dog: 'milo', dayOffset: 1, time: '09:00', durationMinutes: 45, route: 'riverside-loop' },
  {
    dog: 'luna',
    dayOffset: 1,
    time: '11:30',
    durationMinutes: 30,
    route: 'quiet-garden',
    handlingNotes: 'Short legs: keep to flat paths and let her set the pace.',
  },
  {
    dog: 'cooper',
    dayOffset: 1,
    time: '15:00',
    durationMinutes: 60,
    route: 'north-trail',
    handlingNotes: 'Use the front-clip harness. Pulls towards bikes.',
  },
  { dog: 'charlie', dayOffset: 2, time: '10:00', durationMinutes: 45, route: 'quiet-garden' },
  { dog: 'cooper', dayOffset: 2, time: '14:30', durationMinutes: 45, route: 'enrichment-yard' },
  { dog: 'milo', dayOffset: 3, time: '09:30', durationMinutes: 60, route: 'north-trail' },
  { dog: 'luna', dayOffset: 3, time: '13:00', durationMinutes: 30, route: 'quiet-garden' },
  { dog: 'charlie', dayOffset: 4, time: '10:30', durationMinutes: 45, route: 'riverside-loop' },
  { dog: 'milo', dayOffset: 4, time: '16:00', durationMinutes: 45, route: 'riverside-loop' },
  { dog: 'cooper', dayOffset: 5, time: '09:00', durationMinutes: 60, route: 'north-trail' },
  { dog: 'luna', dayOffset: 5, time: '11:00', durationMinutes: 30, route: 'quiet-garden' },
  { dog: 'charlie', dayOffset: 6, time: '10:00', durationMinutes: 45, route: 'quiet-garden' },
  { dog: 'milo', dayOffset: 6, time: '12:00', durationMinutes: 45, route: 'riverside-loop' },
]

// Demo bookings so the staff dashboard has something to show. Indexes point into SLOTS.
const BOOKINGS: {
  slotIndex: number
  fullName: string
  email: string
  phone: string
  experience: 'first-time' | 'some' | 'experienced'
  notes?: string
  status: BookingStatusValue
}[] = [
  {
    slotIndex: 0,
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '555-0101',
    experience: 'experienced',
    status: 'confirmed',
  },
  {
    slotIndex: 1,
    fullName: 'Maya Chen',
    email: 'maya.chen@example.com',
    phone: '555-0102',
    experience: 'first-time',
    notes: 'First time volunteering, happy to take a quiet dog.',
    status: 'pending',
  },
  {
    slotIndex: 4,
    fullName: 'Noah Bennett',
    email: 'noah.bennett@example.com',
    phone: '555-0103',
    experience: 'some',
    status: 'pending',
  },
]

const pad = (value: number) => String(value).padStart(2, '0')

/** Local date (`dayOffset` days from today) at the given HH:MM time. */
function slotDate(dayOffset: number, time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

const localDateLabel = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Downloads the dog's photo; falls back to the bundled placeholder when offline. */
async function preparePhoto(payload: Payload, dog: SeedDog) {
  const placeholder = { filePath: path.join(PLACEHOLDER_DIR, `${dog.key}.jpg`), cleanup: async () => {} }

  try {
    const response = await fetch(dog.photoURL, { signal: AbortSignal.timeout(10_000) })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.startsWith('image/jpeg')) {
      throw new Error(`HTTP ${response.status} (${contentType || 'no content type'})`)
    }

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shelter-walk-seed-'))
    const filePath = path.join(directory, `${dog.key}.jpg`)
    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()))
    return { filePath, cleanup: () => fs.rm(directory, { recursive: true, force: true }) }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    payload.logger.warn(`Seed: could not download a photo of ${dog.name} (${reason}). Using a placeholder.`)
    return placeholder
  }
}

async function runSeed(payload: Payload) {
  const [admins, dogs] = await Promise.all([
    payload.find({ collection: 'admins', depth: 0, limit: 1, overrideAccess: true }),
    payload.find({ collection: 'dogs', depth: 0, limit: 1, overrideAccess: true }),
  ])
  if (admins.docs.length > 0 || dogs.docs.length > 0) return

  payload.logger.info('Seed: empty database found, adding sample shelter, dogs and walks…')

  const shelter = await payload.create({
    collection: 'shelters',
    overrideAccess: true,
    data: {
      name: 'Riverside Animal Shelter',
      slug: 'riverside-animal-shelter',
      neighborhood: 'Riverside',
      address: '24 Willow Lane',
      description: 'Our main shelter, a short stroll from the river paths and the community garden.',
      active: true,
    },
  })

  const photos = await Promise.all(DOGS.map((dog) => preparePhoto(payload, dog)))
  const dogIDs = new Map<SeedDog['key'], number>()

  for (const [index, dog] of DOGS.entries()) {
    const photo = photos[index]
    try {
      const media = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: `${dog.name}, a ${dog.breed.toLowerCase()} at the shelter` },
        filePath: photo.filePath,
      })

      const created = await payload.create({
        collection: 'dogs',
        overrideAccess: true,
        data: {
          name: dog.name,
          shelter: shelter.id,
          photo: media.id,
          breed: dog.breed,
          ageLabel: dog.ageLabel,
          size: dog.size,
          energy: dog.energy,
          bio: dog.bio,
          traits: dog.traits.map((label) => ({ label })),
          kennel: dog.kennel,
          temperament: dog.temperament,
          active: true,
        },
      })
      dogIDs.set(dog.key, created.id)
    } finally {
      await photo.cleanup()
    }
  }

  const slotIDs: number[] = []
  for (const slot of SLOTS) {
    const dog = DOGS.find((item) => item.key === slot.dog)!
    const startsAt = slotDate(slot.dayOffset, slot.time)
    const created = await payload.create({
      collection: 'walk-slots',
      overrideAccess: true,
      data: {
        label: `${dog.name} · ${localDateLabel(startsAt)}`,
        dog: dogIDs.get(slot.dog)!,
        shelter: shelter.id,
        startsAt: startsAt.toISOString(),
        durationMinutes: slot.durationMinutes,
        route: slot.route,
        handlingNotes: slot.handlingNotes,
        status: 'available',
      },
    })
    slotIDs.push(created.id)
  }

  // Creating a booking marks its walk as booked (see the Bookings collection hooks).
  for (const booking of BOOKINGS) {
    await payload.create({
      collection: 'bookings',
      overrideAccess: true,
      data: {
        slot: slotIDs[booking.slotIndex],
        fullName: booking.fullName,
        email: booking.email,
        phone: booking.phone,
        experience: booking.experience,
        notes: booking.notes,
        status: booking.status,
      },
    })
  }

  payload.logger.info(
    `Seed: added 1 shelter, ${DOGS.length} dogs, ${SLOTS.length} walks and ${BOOKINGS.length} demo bookings.`,
  )
}

const seedState = globalThis as typeof globalThis & { __shelterWalkSeed?: Promise<void> }

export function seedStarterData(payload: Payload): Promise<void> {
  // Run at most once per server process, even if Payload initialises more than once.
  seedState.__shelterWalkSeed ??= runSeed(payload).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error)
    payload.logger.error(`Seed: could not add the starter data: ${reason}`)
  })
  return seedState.__shelterWalkSeed
}
