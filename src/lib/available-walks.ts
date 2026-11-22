import type { Payload } from 'payload'
import type { WalkOption } from '@/app/(frontend)/booking-experience'

/**
 * The walks the public site lists (the home page): open walks that have not started yet,
 * for an active dog with a photo at an active shelter, soonest first, at most 24. Read
 * with the public's access, so staff-only fields are never included.
 */
export async function findAvailableWalks(
  payload: Payload,
  now = new Date(),
): Promise<WalkOption[]> {
  const result = await payload.find({
    collection: 'walk-slots',
    overrideAccess: false,
    depth: 3,
    limit: 24,
    sort: 'startsAt',
    where: {
      and: [{ status: { equals: 'available' } }, { startsAt: { greater_than: now.toISOString() } }],
    },
  })

  return result.docs.flatMap((slot) => {
    if (typeof slot.dog !== 'object' || typeof slot.shelter !== 'object') return []
    const dog = slot.dog
    const shelter = slot.shelter
    if (typeof dog.photo !== 'object' || !dog.photo.url || !dog.active || !shelter.active) return []

    return [
      {
        id: String(slot.id),
        startsAt: slot.startsAt,
        durationMinutes: slot.durationMinutes,
        dog: {
          name: dog.name,
          breed: dog.breed,
          ageLabel: dog.ageLabel,
          size: dog.size,
          energy: dog.energy,
          bio: dog.bio,
          traits: (dog.traits ?? []).map((trait) => trait.label),
          photo: {
            url: dog.photo.url,
            alt: dog.photo.alt,
            width: dog.photo.width,
            height: dog.photo.height,
          },
        },
        shelter: {
          name: shelter.name,
          neighborhood: shelter.neighborhood,
          address: shelter.address,
        },
      },
    ]
  })
}
