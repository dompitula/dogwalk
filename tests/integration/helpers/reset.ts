import { getTestPayload } from './payload'

/**
 * Empties this test file's database. Bookings go first: a walk with a booking cannot be
 * deleted (WalkSlots `beforeDelete`).
 */
export async function clearData() {
  const payload = await getTestPayload()
  for (const collection of [
    'bookings',
    'walk-slots',
    'dogs',
    'media',
    'shelters',
    'admins',
  ] as const) {
    const { errors } = await payload.delete({
      collection,
      where: { id: { exists: true } },
      overrideAccess: true,
    })
    if (errors.length) {
      throw new Error(`Could not clear ${collection}: ${errors.map((e) => e.message).join('; ')}`)
    }
  }
  await payload.updateGlobal({
    slug: 'email-settings',
    overrideAccess: true,
    data: { enabled: false, from: null, replyTo: null, timeZone: 'Europe/Warsaw' },
  })
}
