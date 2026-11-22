import { describe, expect, it } from 'vitest'
import type {
  DashboardBooking,
  DashboardData,
  DashboardDog,
  DashboardWalk,
} from '@/app/(dashboard)/dashboard/types'
import {
  FALLBACK_PHOTO,
  dateKey,
  getWeekStart,
  groupVolunteers,
  initialsOf,
  isInWeek,
  nextWalkFor,
  statusOptionsFor,
  toWalkViews,
  weekOf,
} from '@/app/(dashboard)/dashboard/walk-view'
import { WALK_STATUSES } from '@/lib/walks'

// Dates are local (Europe/Warsaw, see vitest.config.ts). new Date(y, m, d, h) months are 0-based.
const local = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes)

const parts = (date: Date) => [
  date.getFullYear(),
  date.getMonth() + 1,
  date.getDate(),
  date.getHours(),
  date.getMinutes(),
  date.getSeconds(),
  date.getMilliseconds(),
]

const dog = (id: string, changes: Partial<DashboardDog> = {}): DashboardDog => ({
  id,
  name: `Dog ${id}`,
  breed: 'Mixed',
  ageLabel: 'Adult',
  energy: 'moderate',
  kennel: `A-${id}`,
  specialCare: [],
  careNotes: null,
  temperament: null,
  traits: [],
  active: true,
  photoUrl: `/api/media/file/dog-${id}.jpg`,
  photoAlt: `Dog ${id}`,
  ...changes,
})

const booking = (changes: Partial<DashboardBooking> = {}): DashboardBooking => ({
  id: 'b1',
  fullName: 'Maya Chen',
  email: 'maya.chen@example.com',
  phone: '555-0102',
  experience: 'some',
  notes: null,
  status: 'pending',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...changes,
})

const walk = (id: string, startsAt: Date, changes: Partial<DashboardWalk> = {}): DashboardWalk => ({
  id,
  dogId: '1',
  startsAt: startsAt.toISOString(),
  durationMinutes: 45,
  route: null,
  handlingNotes: null,
  slotStatus: 'available',
  booking: null,
  ...changes,
})

const data = (walks: DashboardWalk[], dogs = [dog('1')]): DashboardData => ({
  staffEmail: 'staff@example.com',
  dogs,
  walks,
})

describe('getWeekStart', () => {
  it('moves a Sunday back to the previous Monday', () => {
    expect(parts(getWeekStart(local(2026, 11, 22, 15, 30)))).toEqual([2026, 11, 16, 0, 0, 0, 0])
  })

  it('keeps a Monday and sets the time to midnight', () => {
    expect(parts(getWeekStart(local(2026, 11, 16, 23, 59)))).toEqual([2026, 11, 16, 0, 0, 0, 0])
  })

  it('handles the week the clocks go forward (last Sunday of March)', () => {
    const sunday = local(2026, 3, 29, 12)
    const monday = getWeekStart(sunday)
    expect(parts(monday)).toEqual([2026, 3, 23, 0, 0, 0, 0])
    // Sanity check that daylight saving time really starts in this week.
    expect(monday.getTimezoneOffset()).not.toBe(sunday.getTimezoneOffset())
    expect(parts(getWeekStart(local(2026, 4, 1, 9)))).toEqual([2026, 3, 30, 0, 0, 0, 0])
  })

  it('does not change its input', () => {
    const input = local(2026, 11, 22, 15, 30)
    getWeekStart(input)
    expect(parts(input)).toEqual([2026, 11, 22, 15, 30, 0, 0])
  })
})

describe('weekOf', () => {
  it('has 7 days from Monday to Sunday', () => {
    const week = weekOf(getWeekStart(local(2026, 11, 18)))
    expect(week.days).toHaveLength(7)
    expect(week.days.map((day) => day.getDate())).toEqual([16, 17, 18, 19, 20, 21, 22])
    expect(week.start.getDay()).toBe(1)
    expect(week.end.getDay()).toBe(0)
    expect(week.end).toBe(week.days[6])
  })

  it('keeps every day at midnight across the DST change', () => {
    const week = weekOf(getWeekStart(local(2026, 3, 25)))
    expect(week.days.map((day) => day.getDate())).toEqual([23, 24, 25, 26, 27, 28, 29])
    expect(week.days.every((day) => day.getHours() === 0)).toBe(true)
  })
})

const viewAt = (date: Date) => toWalkViews(data([walk('1', date)]), {})[0]

describe('isInWeek', () => {
  const week = weekOf(getWeekStart(local(2026, 11, 18)))

  it('includes both edges of the week', () => {
    expect(isInWeek(viewAt(local(2026, 11, 16, 0, 0)), week)).toBe(true)
    expect(isInWeek(viewAt(local(2026, 11, 22, 23, 59)), week)).toBe(true)
  })

  it('excludes the days before and after', () => {
    expect(isInWeek(viewAt(local(2026, 11, 15, 23, 59)), week)).toBe(false)
    expect(isInWeek(viewAt(local(2026, 11, 23, 0, 0)), week)).toBe(false)
  })
})

describe('initialsOf', () => {
  it.each([
    ['Maya Chen', 'MC'],
    ['alex.morgan@example.com', 'AM'],
    ['', '?'],
  ])('%j -> %j', (value, expected) => {
    expect(initialsOf(value)).toBe(expected)
  })
})

describe('nextWalkFor', () => {
  const now = local(2026, 11, 20, 12)

  it('skips past and cancelled walks and picks the earliest', () => {
    const walks = toWalkViews(
      data([
        walk('later', local(2026, 11, 25, 9)),
        walk('past', local(2026, 11, 19, 9)),
        walk('cancelled', local(2026, 11, 21, 9), { slotStatus: 'cancelled' }),
        walk('next', local(2026, 11, 22, 9)),
      ]),
      {},
    )
    expect(nextWalkFor(walks, now)?.id).toBe('next')
  })

  it('gives undefined when nothing is coming up', () => {
    const walks = toWalkViews(data([walk('past', local(2026, 11, 19, 9))]), {})
    expect(nextWalkFor(walks, now)).toBeUndefined()
  })
})

describe('statusOptionsFor', () => {
  it('offers every status for a booked walk', () => {
    const [view] = toWalkViews(data([walk('1', local(2026, 11, 20), { booking: booking() })]), {})
    expect(statusOptionsFor(view)).toEqual(WALK_STATUSES)
  })

  it('offers only open or cancelled for a walk nobody booked', () => {
    const [view] = toWalkViews(data([walk('1', local(2026, 11, 20))]), {})
    expect(statusOptionsFor(view)).toEqual(['Needs Volunteer', 'Cancelled'])
  })
})

describe('toWalkViews', () => {
  it('joins a walk with its dog and booking', () => {
    const start = local(2026, 11, 20, 9, 30)
    const [view] = toWalkViews(
      data([walk('1', start, { route: 'quiet-garden', booking: booking() })]),
      {},
    )
    expect(view).toMatchObject({
      id: '1',
      dogName: 'Dog 1',
      kennel: 'A-1',
      image: '/api/media/file/dog-1.jpg',
      date: dateKey(start),
      time: '09:30',
      route: 'Quiet Garden',
      walker: 'Maya Chen',
      status: 'Pending',
    })
  })

  it('shows an unknown dog with the fallback photo', () => {
    const [view] = toWalkViews(data([walk('1', local(2026, 11, 20), { dogId: '99' })]), {})
    expect(view.dog).toBeNull()
    expect(view.dogName).toBe('Unknown dog')
    expect(view.image).toBe(FALLBACK_PHOTO)
    expect(view.kennel).toBe('—')
  })

  it('uses the fallback photo for a dog without one', () => {
    const [view] = toWalkViews(
      data([walk('1', local(2026, 11, 20))], [dog('1', { photoUrl: null })]),
      {},
    )
    expect(view.image).toBe(FALLBACK_PHOTO)
  })

  it('lets status overrides win over the derived status', () => {
    const [view] = toWalkViews(data([walk('1', local(2026, 11, 20), { booking: booking() })]), {
      '1': 'Scheduled',
    })
    expect(view.status).toBe('Scheduled')
  })

  it('shows a walk without a booking as unassigned', () => {
    const [view] = toWalkViews(data([walk('1', local(2026, 11, 20))]), {})
    expect(view.walker).toBe('Unassigned')
    expect(view.status).toBe('Needs Volunteer')
  })
})

describe('groupVolunteers', () => {
  it('groups by email ignoring case, sorts by name, keeps walks in schedule order', () => {
    const maya = booking({ fullName: 'Maya Chen', email: 'Maya.Chen@example.com' })
    const mayaLower = booking({ id: 'b2', fullName: 'Maya Chen', email: 'maya.chen@example.com' })
    const alex = booking({ id: 'b3', fullName: 'Alex Morgan', email: 'alex@example.com' })
    const walks = toWalkViews(
      data([
        walk('m2', local(2026, 11, 24, 9), { booking: mayaLower }),
        walk('a1', local(2026, 11, 22, 9), { booking: alex }),
        walk('open', local(2026, 11, 21, 9)),
        walk('m1', local(2026, 11, 20, 9), { booking: maya }),
      ]),
      {},
    )

    const volunteers = groupVolunteers(walks)

    expect(volunteers.map((volunteer) => volunteer.name)).toEqual(['Alex Morgan', 'Maya Chen'])
    expect(volunteers[1].key).toBe('maya.chen@example.com')
    expect(volunteers[1].walks.map((item) => item.id)).toEqual(['m1', 'm2'])
    expect(volunteers[0].walks.map((item) => item.id)).toEqual(['a1'])
  })
})
