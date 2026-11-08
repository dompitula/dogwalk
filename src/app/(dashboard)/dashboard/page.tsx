import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import type { BookingStatusValue, SlotStatusValue } from '@/lib/walks'
import { DashboardApp } from './dashboard-app'
import type { DashboardBooking, DashboardData, DashboardDog, DashboardWalk } from './types'

export const metadata: Metadata = {
  title: 'Staff dashboard · ShelterWalk',
}

const relationID = (value: unknown): string =>
  value && typeof value === 'object' && 'id' in value
    ? String((value as { id: string | number }).id)
    : value == null
      ? ''
      : String(value)

export default async function DashboardPage() {
  const { payload, user } = await getStaffSession()
  if (!user) redirect('/dashboard/login')

  const [dogResult, slotResult, bookingResult] = await Promise.all([
    payload.find({
      collection: 'dogs',
      depth: 1,
      pagination: false,
      sort: 'name',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'walk-slots',
      depth: 0,
      pagination: false,
      sort: 'startsAt',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'bookings',
      depth: 0,
      pagination: false,
      overrideAccess: false,
      user,
    }),
  ])

  const dogs: DashboardDog[] = dogResult.docs.map((dog) => {
    const photo = dog.photo && typeof dog.photo === 'object' ? dog.photo : null
    return {
      id: String(dog.id),
      name: dog.name,
      breed: dog.breed,
      ageLabel: dog.ageLabel,
      energy: dog.energy,
      kennel: dog.kennel ?? null,
      temperament: dog.temperament ?? null,
      traits: (dog.traits ?? []).map((trait) => trait.label),
      active: Boolean(dog.active),
      photoUrl: photo?.url ?? null,
      photoAlt: photo?.alt ?? dog.name,
    }
  })

  const bookingsBySlot = new Map<string, DashboardBooking>()
  for (const booking of bookingResult.docs) {
    bookingsBySlot.set(relationID(booking.slot), {
      id: String(booking.id),
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      experience: booking.experience,
      notes: booking.notes ?? null,
      status: booking.status as BookingStatusValue,
      createdAt: booking.createdAt,
    })
  }

  const walks: DashboardWalk[] = slotResult.docs.map((slot) => ({
    id: String(slot.id),
    dogId: relationID(slot.dog),
    startsAt: slot.startsAt,
    durationMinutes: slot.durationMinutes,
    route: slot.route ?? null,
    handlingNotes: slot.handlingNotes ?? null,
    slotStatus: slot.status as SlotStatusValue,
    booking: bookingsBySlot.get(String(slot.id)) ?? null,
  }))

  const data: DashboardData = {
    staffEmail: typeof user.email === 'string' ? user.email : '',
    dogs,
    walks,
  }

  return <DashboardApp data={data} />
}
