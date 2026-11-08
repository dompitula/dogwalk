import type { BookingStatusValue, SlotStatusValue } from '@/lib/walks'

/** Plain, serialisable data handed from the dashboard page (server) to the dashboard UI (browser). */

export type DashboardDog = {
  id: string
  name: string
  breed: string
  ageLabel: string
  energy: string
  kennel: string | null
  temperament: string | null
  traits: string[]
  active: boolean
  photoUrl: string | null
  photoAlt: string
}

export type DashboardBooking = {
  id: string
  fullName: string
  email: string
  phone: string
  experience: string
  notes: string | null
  status: BookingStatusValue
  createdAt: string
}

export type DashboardWalk = {
  id: string
  dogId: string
  startsAt: string
  durationMinutes: number
  route: string | null
  handlingNotes: string | null
  slotStatus: SlotStatusValue
  booking: DashboardBooking | null
}

export type DashboardData = {
  staffEmail: string
  dogs: DashboardDog[]
  walks: DashboardWalk[]
}

export type CreateWalkInput = {
  dogId: string
  /** ISO timestamp built in the browser from the local date and time inputs. */
  startsAt: string
  /** The same date and time as typed, "YYYY-MM-DD HH:MM", used for the admin label. */
  localLabel: string
  durationMinutes: number
  route: string
  handlingNotes: string
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; signedOut?: boolean }
