import { describe, expect, it } from 'vitest'
import {
  BOOKING_STATUS_FOR_WALK_STATUS,
  BOOKING_STATUS_OPTIONS,
  type BookingStatusValue,
  type WalkStatus,
  deriveWalkStatus,
  routeLabel,
  statusClass,
} from '@/lib/walks'

const BOOKING_STATUSES = BOOKING_STATUS_OPTIONS.map((option) => option.value)

describe('deriveWalkStatus', () => {
  it.each([...BOOKING_STATUSES, null])('a cancelled walk wins over booking status %j', (status) => {
    expect(deriveWalkStatus('cancelled', status)).toBe('Cancelled')
  })

  const labels: [BookingStatusValue | null, WalkStatus][] = [
    ['pending', 'Pending'],
    ['confirmed', 'Scheduled'],
    ['checked-out', 'Checked Out'],
    ['returned', 'Returned'],
    ['cancelled', 'Cancelled'],
    [null, 'Needs Volunteer'],
  ]

  it.each(labels)('booking status %j shows as %j', (bookingStatus, expected) => {
    expect(deriveWalkStatus('booked', bookingStatus)).toBe(expected)
    expect(deriveWalkStatus('available', bookingStatus)).toBe(expected)
  })

  it('covers every booking status', () => {
    expect(labels.map(([status]) => status).filter(Boolean)).toEqual(BOOKING_STATUSES)
  })

  it.each(Object.entries(BOOKING_STATUS_FOR_WALK_STATUS))(
    'round trip: %j is stored as %j and read back',
    (walkStatus, bookingStatus) => {
      expect(deriveWalkStatus('booked', bookingStatus)).toBe(walkStatus)
    },
  )
})

describe('statusClass', () => {
  it.each([
    ['Needs Volunteer', 'needs-volunteer'],
    ['Checked Out', 'checked-out'],
    ['Pending', 'pending'],
  ] as const)('%j -> %j', (status, expected) => {
    expect(statusClass(status)).toBe(expected)
  })
})

describe('routeLabel', () => {
  it('gives the label of a known route', () => {
    expect(routeLabel('quiet-garden')).toBe('Quiet Garden')
  })

  it.each(['unknown-route', null, undefined])('gives null for %j', (value) => {
    expect(routeLabel(value)).toBeNull()
  })
})
