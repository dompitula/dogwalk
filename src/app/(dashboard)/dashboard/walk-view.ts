import { WALK_STATUSES, type WalkStatus, deriveWalkStatus, routeLabel } from '@/lib/walks'
import type { DashboardData, DashboardDog, DashboardWalk } from './types'

/**
 * The dashboard's view of the data (no React): walks joined with their dog and booking,
 * volunteers, the calendar week, and the date and label helpers the views share.
 */

/** The dashboard's views, as listed in the sidebar. */
export type NavView = 'Overview' | 'Schedule' | 'Dogs' | 'Volunteers' | 'Settings'

/** One walk as the dashboard shows it: the walk slot joined with its dog and booking. */
export type WalkView = {
  id: string
  walk: DashboardWalk
  dog: DashboardDog | null
  dogName: string
  breed: string
  image: string
  kennel: string
  start: Date
  date: string
  time: string
  route: string | null
  walker: string
  status: WalkStatus
}

/** Someone who booked at least one walk on the public site, with their walks. */
export type Volunteer = {
  key: string
  name: string
  email: string
  phone: string
  experience: string
  walks: WalkView[]
}

/** A calendar week, Monday to Sunday. */
export type Week = { start: Date; end: Date; days: Date[] }

/** Shown for a dog without a photo. A data URI, so its colours are the forest-100 and forest-600 tokens' values. */
export const FALLBACK_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e6f3e9"/><g fill="#3e7a5d"><ellipse cx="60" cy="72" rx="18" ry="15"/><circle cx="38" cy="54" r="7"/><circle cx="51" cy="42" r="7"/><circle cx="69" cy="42" r="7"/><circle cx="82" cy="54" r="7"/></g></svg>',
)}`

const pad = (value: number) => String(value).padStart(2, '0')

/** "YYYY-MM-DD" in the viewer's time zone. */
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** "HH:MM" in the viewer's time zone. */
export const timeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Midnight on the Monday of `input`'s week. */
export function getWeekStart(input = new Date()) {
  const date = new Date(input)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

export function weekOf(start: Date): Week {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
  return { start, end: days[6], days }
}

export const isInWeek = (walk: WalkView, week: Week) =>
  walk.date >= dateKey(week.start) && walk.date <= dateKey(week.end)

export const formatDay = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('en-US', options)

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const initialsOf = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const bySchedule = (a: WalkView, b: WalkView) => a.start.getTime() - b.start.getTime()

/** The first of `walks` that has not started yet and is not cancelled. */
export const nextWalkFor = (walks: WalkView[], now: Date) =>
  walks.filter((walk) => walk.start >= now && walk.status !== 'Cancelled').sort(bySchedule)[0]

/** The statuses staff can pick for a walk: a walk nobody booked can only be open or cancelled. */
export const statusOptionsFor = (walk: WalkView): WalkStatus[] =>
  walk.walk.booking ? WALK_STATUSES : ['Needs Volunteer', 'Cancelled']

/** A page in the content manager (/admin): a collection's list, its create form, or one document. */
export const adminURL = (collection: 'dogs' | 'walk-slots' | 'bookings', id?: string) =>
  `/admin/collections/${collection}${id ? `/${id}` : ''}`

/** The walks as the dashboard shows them. `statusOverrides` are statuses shown before the server confirms them. */
export function toWalkViews(
  data: DashboardData,
  statusOverrides: Record<string, WalkStatus>,
): WalkView[] {
  const dogsById = new Map(data.dogs.map((dog) => [dog.id, dog]))
  return data.walks.map((walk) => {
    const dog = dogsById.get(walk.dogId) ?? null
    const start = new Date(walk.startsAt)
    return {
      id: walk.id,
      walk,
      dog,
      dogName: dog?.name ?? 'Unknown dog',
      breed: dog?.breed ?? '',
      image: dog?.photoUrl ?? FALLBACK_PHOTO,
      kennel: dog?.kennel || '—',
      start,
      date: dateKey(start),
      time: timeKey(start),
      route: routeLabel(walk.route),
      walker: walk.booking?.fullName ?? 'Unassigned',
      status:
        statusOverrides[walk.id] ?? deriveWalkStatus(walk.slotStatus, walk.booking?.status ?? null),
    }
  })
}

/** Everyone who booked a walk, by email address, sorted by name. */
export function groupVolunteers(walks: WalkView[]): Volunteer[] {
  const byEmail = new Map<string, Volunteer>()
  for (const walk of [...walks].sort(bySchedule)) {
    const booking = walk.walk.booking
    if (!booking) continue
    const key = booking.email.toLowerCase()
    const volunteer = byEmail.get(key) ?? {
      key,
      name: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      experience: booking.experience,
      walks: [],
    }
    volunteer.walks.push(walk)
    byEmail.set(key, volunteer)
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name))
}
