/**
 * Shared walk vocabulary used by the Payload collections (server) and the staff
 * dashboard (browser). Keep this file free of server-only imports.
 */

export const WALK_ROUTES = [
  { label: 'Riverside Loop', value: 'riverside-loop' },
  { label: 'Quiet Garden', value: 'quiet-garden' },
  { label: 'North Trail', value: 'north-trail' },
  { label: 'Enrichment Yard', value: 'enrichment-yard' },
] as const

export type WalkRouteValue = (typeof WALK_ROUTES)[number]['value']

export const BOOKING_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Checked out', value: 'checked-out' },
  { label: 'Returned', value: 'returned' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

export type BookingStatusValue = (typeof BOOKING_STATUS_OPTIONS)[number]['value']

export type SlotStatusValue = 'available' | 'booked' | 'cancelled'

export const EXPERIENCE_LABELS: Record<string, string> = {
  'first-time': 'First-time walker',
  some: 'Some experience',
  experienced: 'Experienced walker',
}

export const ENERGY_LABELS: Record<string, string> = {
  easygoing: 'Easygoing',
  moderate: 'Moderate',
  high: 'High energy',
}

export const WALK_DURATIONS = [30, 45, 60, 90] as const

/** Status shown in the staff dashboard, derived from the walk slot and its booking. */
export type WalkStatus =
  | 'Pending'
  | 'Scheduled'
  | 'Needs Volunteer'
  | 'Checked Out'
  | 'Returned'
  | 'Cancelled'

export const WALK_STATUSES: WalkStatus[] = [
  'Pending',
  'Scheduled',
  'Needs Volunteer',
  'Checked Out',
  'Returned',
  'Cancelled',
]

/** Statuses that need a volunteer booking, mapped to the booking's `status` value. */
export const BOOKING_STATUS_FOR_WALK_STATUS: Record<
  Exclude<WalkStatus, 'Needs Volunteer'>,
  BookingStatusValue
> = {
  Pending: 'pending',
  Scheduled: 'confirmed',
  'Checked Out': 'checked-out',
  Returned: 'returned',
  Cancelled: 'cancelled',
}

export function deriveWalkStatus(
  slotStatus: SlotStatusValue,
  bookingStatus: BookingStatusValue | null,
): WalkStatus {
  if (slotStatus === 'cancelled') return 'Cancelled'
  switch (bookingStatus) {
    case 'pending':
      return 'Pending'
    case 'confirmed':
      return 'Scheduled'
    case 'checked-out':
      return 'Checked Out'
    case 'returned':
      return 'Returned'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Needs Volunteer'
  }
}

/** CSS modifier class for a status, e.g. "Needs Volunteer" -> "needs-volunteer". */
export const statusClass = (status: WalkStatus) => status.toLowerCase().replace(/\s+/g, '-')

export const routeLabel = (value: string | null | undefined) =>
  WALK_ROUTES.find((route) => route.value === value)?.label ?? null
