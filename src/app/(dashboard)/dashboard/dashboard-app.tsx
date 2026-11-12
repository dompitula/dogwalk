'use client'

import { type FormEvent, type ReactNode, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ENERGY_LABELS,
  EXPERIENCE_LABELS,
  WALK_DURATIONS,
  WALK_ROUTES,
  WALK_STATUSES,
  type WalkStatus,
  deriveWalkStatus,
  routeLabel,
  statusClass,
} from '@/lib/walks'
import { useModalDialog } from '@/lib/use-modal-dialog'
import { createWalk, removeWalk, setWalkStatus } from './actions'
import type { ActionResult, DashboardData, DashboardDog, DashboardWalk } from './types'

type IconName =
  | 'calendar'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'dogs'
  | 'external'
  | 'home'
  | 'location'
  | 'logout'
  | 'menu'
  | 'plus'
  | 'search'
  | 'settings'
  | 'trash'
  | 'users'
  | 'x'

type NavView = 'Overview' | 'Schedule' | 'Dogs' | 'Volunteers' | 'Settings'

/** One walk as the dashboard shows it: the walk slot joined with its dog and booking. */
type WalkView = {
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

type Volunteer = {
  key: string
  name: string
  email: string
  phone: string
  experience: string
  walks: WalkView[]
}

const DURATION_STORAGE_KEY = 'shelterwalk-default-duration'

const FALLBACK_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e5f2e9"/><g fill="#3f8064"><ellipse cx="60" cy="72" rx="18" ry="15"/><circle cx="38" cy="54" r="7"/><circle cx="51" cy="42" r="7"/><circle cx="69" cy="42" r="7"/><circle cx="82" cy="54" r="7"/></g></svg>',
)}`

function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    dogs: (
      <>
        <path d="M10 5.5C8.5 3 5.5 2.5 4 4c-1.5 1.5-.5 4.5 2 5.5" />
        <path d="M14 5.5C15.5 3 18.5 2.5 20 4c1.5 1.5.5 4.5-2 5.5" />
        <path d="M6 10c0 7 2.7 11 6 11s6-4 6-11c-1.8-2-3.8-3-6-3s-4.2 1-6 3Z" />
        <path d="M9.5 13h.01M14.5 13h.01M10 17c1.2 1 2.8 1 4 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.08A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.08A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </>
    ),
    external: (
      <>
        <path d="M15 3h6v6M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const pad = (value: number) => String(value).padStart(2, '0')

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const timeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

function getWeekStart(input = new Date()) {
  const date = new Date(input)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

const formatDay = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('en-US', options)

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const initialsOf = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

const bySchedule = (a: WalkView, b: WalkView) => a.start.getTime() - b.start.getTime()

/** A page in the content manager (/admin): a collection's list, its create form, or one document. */
const adminURL = (collection: 'dogs' | 'walk-slots' | 'bookings', id?: string) =>
  `/admin/collections/${collection}${id ? `/${id}` : ''}`

export function DashboardApp({ data }: { data: DashboardData }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [busyWalkId, setBusyWalkId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WalkStatus>>({})
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | WalkStatus>('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavView>('Schedule')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalDogId, setModalDogId] = useState('')
  const [modalDate, setModalDate] = useState('')
  const [modalError, setModalError] = useState('')
  const [detailsWalkId, setDetailsWalkId] = useState<string | null>(null)
  const [defaultDuration, setDefaultDuration] = useState<number>(45)

  // The dashboard depends on the viewer's clock and time zone, so it renders in the browser only.
  useEffect(() => {
    setMounted(true)
    try {
      const stored = Number(window.localStorage.getItem(DURATION_STORAGE_KEY))
      if ((WALK_DURATIONS as readonly number[]).includes(stored)) setDefaultDuration(stored)
    } catch {
      // Storage can be unavailable (private mode); the default stays at 45 minutes.
    }
  }, [])

  // Fresh data from the server replaces any status shown optimistically.
  useEffect(() => {
    setStatusOverrides({})
  }, [data])

  useEffect(() => {
    if (notice?.kind !== 'success') return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const dogsById = useMemo(() => new Map(data.dogs.map((dog) => [dog.id, dog])), [data.dogs])
  const activeDogs = useMemo(() => data.dogs.filter((dog) => dog.active), [data.dogs])

  const walks = useMemo<WalkView[]>(
    () =>
      data.walks.map((walk) => {
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
            statusOverrides[walk.id] ??
            deriveWalkStatus(walk.slotStatus, walk.booking?.status ?? null),
        }
      }),
    [data.walks, dogsById, statusOverrides],
  )

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + index)
        return date
      }),
    [weekStart],
  )

  const visibleWalks = useMemo(
    () =>
      walks
        .filter((walk) => walk.date === selectedDate)
        .filter((walk) => statusFilter === 'All' || walk.status === statusFilter)
        .filter((walk) =>
          `${walk.dogName} ${walk.kennel} ${walk.route ?? ''} ${walk.walker} ${walk.walk.booking?.email ?? ''}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .sort(bySchedule),
    [walks, search, selectedDate, statusFilter],
  )

  const volunteers = useMemo<Volunteer[]>(() => {
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
  }, [walks])

  const detailsWalk = walks.find((walk) => walk.id === detailsWalkId) ?? null

  const walkDialogRef = useModalDialog<HTMLDivElement>(modalOpen, () => setModalOpen(false))
  const detailsDialogRef = useModalDialog<HTMLDivElement>(detailsWalk !== null, () =>
    setDetailsWalkId(null),
  )

  if (!mounted) {
    return (
      <div className="app-loading" role="status">
        Loading dashboard…
      </div>
    )
  }

  const now = new Date()
  const todayKey = dateKey(now)
  const selectedDay = new Date(`${selectedDate}T12:00:00`)
  const weekEnd = weekDays[6]
  const thisWeekWalks = walks.filter(
    (walk) => walk.date >= dateKey(weekStart) && walk.date <= dateKey(weekEnd),
  )
  const upcomingWalks = walks
    .filter((walk) => walk.date >= todayKey && walk.status !== 'Cancelled')
    .sort(bySchedule)
  const nextWalkFor = (items: WalkView[]) =>
    items
      .filter((walk) => walk.start >= now && walk.status !== 'Cancelled')
      .sort(bySchedule)[0]

  function goToDate(date: Date) {
    setWeekStart(getWeekStart(date))
    setSelectedDate(dateKey(date))
  }

  function moveWeek(direction: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + direction * 7)
    setWeekStart(next)
    setSelectedDate(dateKey(next))
  }

  function openNavView(view: NavView) {
    setActiveNav(view)
    setSidebarOpen(false)
  }

  function openWalkModal(dogId = '') {
    setModalDogId(dogId && activeDogs.some((dog) => dog.id === dogId) ? dogId : '')
    setModalDate(selectedDate >= todayKey ? selectedDate : todayKey)
    setModalError('')
    setModalOpen(true)
  }

  function handleResult(result: ActionResult) {
    if (!result.ok && result.signedOut) {
      window.location.assign('/dashboard/login')
      return false
    }
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.message })
      return false
    }
    if (result.message) setNotice({ kind: 'success', text: result.message })
    router.refresh()
    return true
  }

  function runWalkAction(walkId: string, action: () => Promise<ActionResult>, onFail?: () => void) {
    setBusyWalkId(walkId)
    startTransition(async () => {
      try {
        if (!handleResult(await action())) onFail?.()
      } catch {
        onFail?.()
        setNotice({ kind: 'error', text: 'Could not reach the server. Please try again.' })
      } finally {
        setBusyWalkId(null)
      }
    })
  }

  function changeStatus(walk: WalkView, next: WalkStatus) {
    if (next === walk.status) return
    if (
      walk.walk.booking &&
      next === 'Needs Volunteer' &&
      !window.confirm(
        `Remove ${walk.walker}'s booking and reopen ${walk.dogName}'s ${walk.time} walk for public booking?`,
      )
    ) {
      return
    }
    setStatusOverrides((current) => ({ ...current, [walk.id]: next }))
    runWalkAction(
      walk.id,
      () => setWalkStatus(walk.id, next),
      () =>
        setStatusOverrides((current) => {
          const { [walk.id]: _removed, ...rest } = current
          return rest
        }),
    )
  }

  function deleteWalk(walk: WalkView) {
    const bookingNote = walk.walk.booking ? ` This also deletes ${walk.walker}'s booking.` : ''
    if (window.confirm(`Remove ${walk.dogName}'s walk at ${walk.time}?${bookingNote}`)) {
      if (detailsWalkId === walk.id) setDetailsWalkId(null)
      runWalkAction(walk.id, () => removeWalk(walk.id))
    }
  }

  function addWalk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '')
    const time = String(form.get('time') ?? '')
    const start = new Date(`${date}T${time}`)
    if (!date || !time || Number.isNaN(start.getTime())) {
      setModalError('Choose a valid date and start time.')
      return
    }
    setModalError('')
    startTransition(async () => {
      try {
        const result = await createWalk({
          dogId: String(form.get('dog') ?? ''),
          startsAt: start.toISOString(),
          localLabel: `${date} ${time}`,
          durationMinutes: Number(form.get('duration')),
          route: String(form.get('route') ?? ''),
          handlingNotes: String(form.get('notes') ?? ''),
        })
        if (!result.ok) {
          if (result.signedOut) window.location.assign('/dashboard/login')
          else setModalError(result.message)
          return
        }
        setModalOpen(false)
        goToDate(start)
        setActiveNav('Schedule')
        if (result.message) setNotice({ kind: 'success', text: result.message })
        router.refresh()
      } catch {
        setModalError('Could not reach the server. Please try again.')
      }
    })
  }

  async function signOut() {
    try {
      await fetch('/api/admins/logout', { method: 'POST', credentials: 'include' })
    } finally {
      window.location.assign('/dashboard/login')
    }
  }

  function saveDefaultDuration(value: number) {
    setDefaultDuration(value)
    try {
      window.localStorage.setItem(DURATION_STORAGE_KEY, String(value))
    } catch {
      // Ignore storage errors; the choice still applies until the page is reloaded.
    }
  }

  const statusOptionsFor = (walk: WalkView): WalkStatus[] =>
    walk.walk.booking ? WALK_STATUSES : ['Needs Volunteer', 'Cancelled']

  const navItems: { label: NavView; icon: IconName }[] = [
    { label: 'Overview', icon: 'home' },
    { label: 'Schedule', icon: 'calendar' },
    { label: 'Dogs', icon: 'dogs' },
    { label: 'Volunteers', icon: 'users' },
  ]

  const pendingCount = thisWeekWalks.filter((walk) => walk.status === 'Pending').length
  const openCount = thisWeekWalks.filter((walk) => walk.status === 'Needs Volunteer').length

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="dogs" size={25} />
          </span>
          <span>ShelterWalk</span>
        </div>
        <p className="nav-label">Shelter operations</p>
        <nav className="main-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={activeNav === item.label ? 'active' : ''}
              onClick={() => openNavView(item.label)}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button
          className={`settings-link ${activeNav === 'Settings' ? 'active' : ''}`}
          onClick={() => openNavView('Settings')}
        >
          <Icon name="settings" size={19} />
          Settings
        </button>
        <div className="admin-card">
          <div className="admin-avatar">{initialsOf(data.staffEmail)}</div>
          <div>
            <strong title={data.staffEmail}>{data.staffEmail || 'Staff member'}</strong>
            <span>Shelter staff</span>
          </div>
          <button className="signout-button" onClick={signOut} title="Sign out" aria-label="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div>
            <p className="eyebrow">Shelter enrichment</p>
            <h1>{activeNav === 'Schedule' ? 'Weekly schedule' : activeNav}</h1>
          </div>
          <button className="primary-button top-action" onClick={() => openWalkModal()}>
            <Icon name="plus" size={18} />
            Schedule a walk
          </button>
        </header>

        {notice && (
          <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss message">
              <Icon name="x" size={15} />
            </button>
          </div>
        )}

        {activeNav === 'Overview' && (
          <>
            <section className="stats-grid">
              <article className="stat-card accent">
                <div className="stat-icon">
                  <Icon name="calendar" size={21} />
                </div>
                <div>
                  <span>This week</span>
                  <strong>
                    {thisWeekWalks.filter((walk) => walk.status !== 'Cancelled').length} walks
                  </strong>
                </div>
                <span className="stat-note">{pendingCount ? 'Action needed' : 'On track'}</span>
              </article>
              <article className="stat-card">
                <div className="stat-icon amber">
                  <Icon name="clock" size={21} />
                </div>
                <div>
                  <span>Needs attention</span>
                  <strong>
                    {pendingCount} to confirm · {openCount} open
                  </strong>
                </div>
              </article>
              <article className="stat-card">
                <div className="stat-icon green">
                  <Icon name="dogs" size={21} />
                </div>
                <div>
                  <span>Active dogs</span>
                  <strong>{activeDogs.length} shelter dogs</strong>
                </div>
              </article>
            </section>
            <section className="overview-grid">
              <article className="panel overview-main">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">At a glance</p>
                    <h2>Upcoming walks</h2>
                  </div>
                  <button className="text-button" onClick={() => openNavView('Schedule')}>
                    View schedule <Icon name="chevron-right" size={15} />
                  </button>
                </div>
                <div className="upcoming-list">
                  {upcomingWalks.slice(0, 5).map((walk) => (
                    <div className="upcoming-item" key={walk.id}>
                      <img src={walk.image} alt="" />
                      <div>
                        <strong>
                          <button className="link-button" onClick={() => setDetailsWalkId(walk.id)}>
                            {walk.dogName}
                          </button>
                        </strong>
                        <span>{walk.route ?? 'No route set'}</span>
                      </div>
                      <div className="upcoming-date">
                        <strong>
                          {formatDay(walk.start, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </strong>
                        <span>
                          {walk.time} · {walk.walker}
                        </span>
                      </div>
                      <span className={`mini-status ${statusClass(walk.status)}`}>{walk.status}</span>
                    </div>
                  ))}
                  {upcomingWalks.length === 0 && (
                    <div className="empty-state">
                      <h3>No upcoming walks</h3>
                      <p>Schedule a walk and it will appear on the public site for booking.</p>
                    </div>
                  )}
                </div>
              </article>
              <article className="panel status-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">This week</p>
                    <h2>Status breakdown</h2>
                  </div>
                </div>
                <div className="status-breakdown">
                  {WALK_STATUSES.map((status) => {
                    const count = thisWeekWalks.filter((walk) => walk.status === status).length
                    const percent = thisWeekWalks.length
                      ? Math.round((count / thisWeekWalks.length) * 100)
                      : 0
                    return (
                      <div className="breakdown-row" key={status}>
                        <div>
                          <span>{status}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="progress-track">
                          <span className={statusClass(status)} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            </section>
          </>
        )}

        {activeNav === 'Schedule' && (
          <section className="schedule-card">
            <div className="schedule-toolbar">
              <div>
                <p className="eyebrow">Calendar</p>
                <h2>
                  {formatDay(weekStart, { month: 'long', day: 'numeric' })} –{' '}
                  {formatDay(weekEnd, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <div className="calendar-controls">
                <button onClick={() => moveWeek(-1)} aria-label="Previous week">
                  <Icon name="chevron-left" size={18} />
                </button>
                <button className="today-button" onClick={() => goToDate(new Date())}>
                  Today
                </button>
                <button onClick={() => moveWeek(1)} aria-label="Next week">
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            </div>

            <div className="week-strip">
              {weekDays.map((date) => {
                const key = dateKey(date)
                const count = walks.filter((walk) => walk.date === key).length
                return (
                  <button
                    key={key}
                    className={`${selectedDate === key ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`.trim()}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span>{formatDay(date, { weekday: 'short' })}</span>
                    <strong>{date.getDate()}</strong>
                    <i>{count || '–'}</i>
                  </button>
                )
              })}
            </div>

            <div className="list-toolbar">
              <div>
                <h3>{formatDay(selectedDay, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                <span>
                  {visibleWalks.length} scheduled {visibleWalks.length === 1 ? 'walk' : 'walks'}
                </span>
              </div>
              <div className="filter-row">
                <label className="search-field">
                  <Icon name="search" size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search schedule"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'All' | WalkStatus)}
                  aria-label="Filter by status"
                >
                  <option>All</option>
                  {WALK_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="booking-list">
              {visibleWalks.map((walk) => {
                const busy = busyWalkId === walk.id
                return (
                  <article className={`booking-row ${busy ? 'busy' : ''}`.trim()} key={walk.id}>
                    <div className="booking-time">
                      <strong>{formatTime(walk.start)}</strong>
                      <span>{walk.walk.durationMinutes} min</span>
                    </div>
                    <img src={walk.image} alt={`${walk.dogName}, ${walk.breed}`} />
                    <div className="dog-info">
                      <div>
                        <h4>
                          <button
                            className="link-button"
                            onClick={() => setDetailsWalkId(walk.id)}
                            title="Show walk details"
                          >
                            {walk.dogName}
                          </button>
                        </h4>
                        <span>{walk.breed}</span>
                      </div>
                      <div className="kennel-info">
                        <span>Kennel</span>
                        <strong>{walk.kennel}</strong>
                      </div>
                    </div>
                    <div className="route-info">
                      <Icon name="location" size={17} />
                      <div>
                        <span>Approved route</span>
                        <strong>{walk.route ?? 'Not set'}</strong>
                      </div>
                    </div>
                    <div className="walker-info">
                      <span>Volunteer</span>
                      <strong title={walk.walk.booking?.email}>{walk.walker}</strong>
                    </div>
                    <div className="booking-actions">
                      <select
                        className={`status-select ${statusClass(walk.status)}`}
                        value={walk.status}
                        disabled={busy}
                        aria-label={`Change status for ${walk.dogName}`}
                        onChange={(event) => changeStatus(walk, event.target.value as WalkStatus)}
                      >
                        {statusOptionsFor(walk).map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="delete-button"
                        onClick={() => deleteWalk(walk)}
                        disabled={busy}
                        aria-label={`Remove ${walk.dogName}'s walk`}
                        title="Remove walk"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
              {visibleWalks.length === 0 && (
                <div className="empty-state">
                  <span className="empty-icon">
                    <Icon name="dogs" size={30} />
                  </span>
                  <h3>No walks scheduled</h3>
                  <p>This day is wide open. Add a walk to get tails moving.</p>
                  <button className="text-button" onClick={() => openWalkModal()}>
                    <Icon name="plus" size={17} /> Schedule a walk
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeNav === 'Dogs' &&
          (data.dogs.length === 0 ? (
            <section className="panel">
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon name="dogs" size={30} />
                </span>
                <h3>No dogs yet</h3>
                <p>Add dogs, with a photo, in the content manager. They will show up here.</p>
                <a className="text-button" href={adminURL('dogs', 'create')}>
                  Open the content manager <Icon name="external" size={15} />
                </a>
              </div>
            </section>
          ) : (
            <section className="directory-grid">
              {data.dogs.map((dog) => {
                const dogWalks = walks.filter((walk) => walk.dog?.id === dog.id)
                const nextWalk = nextWalkFor(dogWalks)
                return (
                  <article className="profile-card" key={dog.id}>
                    <div className="profile-image-wrap">
                      <img src={dog.photoUrl ?? FALLBACK_PHOTO} alt={dog.photoAlt} />
                      <span>
                        {dogWalks.length} {dogWalks.length === 1 ? 'walk' : 'walks'}
                      </span>
                    </div>
                    <div className="profile-body">
                      <h2>{dog.name}</h2>
                      <p>
                        {dog.breed}
                        {!dog.active && ' · not listed on the public site'}
                      </p>
                      <div className="profile-details">
                        <div>
                          <span>Kennel</span>
                          <strong>{dog.kennel || '—'}</strong>
                        </div>
                        <div>
                          <span>Temperament</span>
                          <strong>{dog.temperament || dog.traits.join(', ') || '—'}</strong>
                        </div>
                        <div>
                          <span>Energy · Age</span>
                          <strong>
                            {ENERGY_LABELS[dog.energy] ?? dog.energy} · {dog.ageLabel}
                          </strong>
                        </div>
                        <div>
                          <span>Next walk</span>
                          <strong>
                            {nextWalk
                              ? `${formatDay(nextWalk.start, { month: 'short', day: 'numeric' })} · ${nextWalk.time}`
                              : 'Not scheduled'}
                          </strong>
                        </div>
                      </div>
                      {dog.active ? (
                        <button className="profile-action" onClick={() => openWalkModal(dog.id)}>
                          <Icon name="plus" size={16} /> Schedule a walk
                        </button>
                      ) : (
                        <a className="profile-action" href={adminURL('dogs', dog.id)}>
                          Edit in content manager <Icon name="external" size={14} />
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </section>
          ))}

        {activeNav === 'Volunteers' &&
          (volunteers.length === 0 ? (
            <section className="panel">
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon name="users" size={30} />
                </span>
                <h3>No volunteers yet</h3>
                <p>People who book a walk on the public site will appear here.</p>
              </div>
            </section>
          ) : (
            <section className="walker-grid">
              {volunteers.map((volunteer, index) => {
                const active = volunteer.walks.filter((walk) => walk.status !== 'Cancelled')
                const thisWeek = active.filter(
                  (walk) => walk.date >= dateKey(weekStart) && walk.date <= dateKey(weekEnd),
                )
                const nextWalk = nextWalkFor(active)
                return (
                  <article className="walker-card" key={volunteer.key}>
                    <div className={`walker-avatar avatar-${(index % 3) + 1}`}>
                      {initialsOf(volunteer.name)}
                    </div>
                    <div className="walker-head">
                      <div>
                        <h2>{volunteer.name}</h2>
                        <p>
                          <a href={`mailto:${volunteer.email}`}>{volunteer.email}</a> ·{' '}
                          <a href={`tel:${volunteer.phone}`}>{volunteer.phone}</a>
                        </p>
                      </div>
                      <span className="available-badge">
                        {EXPERIENCE_LABELS[volunteer.experience] ?? volunteer.experience}
                      </span>
                    </div>
                    <div className="walker-stats">
                      <div>
                        <strong>{thisWeek.length}</strong>
                        <span>This week</span>
                      </div>
                      <div>
                        <strong>{new Set(active.map((walk) => walk.dogName)).size}</strong>
                        <span>Dogs</span>
                      </div>
                      <div>
                        <strong>{active.length}</strong>
                        <span>Total walks</span>
                      </div>
                    </div>
                    <div className="walker-next">
                      <Icon name="calendar" size={17} />
                      <div>
                        <span>Next walk</span>
                        <strong>
                          {nextWalk
                            ? `${nextWalk.dogName} · ${formatDay(nextWalk.start, { month: 'short', day: 'numeric' })} ${nextWalk.time}`
                            : 'No upcoming walks'}
                        </strong>
                      </div>
                    </div>
                    <button
                      className="profile-action"
                      onClick={() => {
                        if (nextWalk) goToDate(nextWalk.start)
                        openNavView('Schedule')
                      }}
                    >
                      View schedule <Icon name="chevron-right" size={15} />
                    </button>
                  </article>
                )
              })}
            </section>
          ))}

        {activeNav === 'Settings' && (
          <section className="panel settings-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Preferences</p>
                <h2>Shelter settings</h2>
              </div>
            </div>
            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <strong>Email settings</strong>
                  <span>Manage booking emails, sender details and test delivery.</span>
                </div>
                <a className="secondary-button settings-action" href="/dashboard/email">
                  Open <Icon name="external" size={14} />
                </a>
              </div>
              <label>
                <div>
                  <strong>Default walk duration</strong>
                  <span>Used when scheduling a new shelter walk. Saved in this browser.</span>
                </div>
                <select
                  value={defaultDuration}
                  onChange={(event) => saveDefaultDuration(Number(event.target.value))}
                >
                  {WALK_DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} min
                    </option>
                  ))}
                </select>
              </label>
              <div className="settings-row">
                <div>
                  <strong>Content manager</strong>
                  <span>Add or edit dogs, photos, shelters, walks, bookings and staff accounts.</span>
                </div>
                <a className="secondary-button settings-action" href="/admin">
                  Open <Icon name="external" size={14} />
                </a>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Public booking site</strong>
                  <span>See the walks visitors can book right now.</span>
                </div>
                <a className="secondary-button settings-action" href="/">
                  Open <Icon name="external" size={14} />
                </a>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Signed in as {data.staffEmail || 'staff member'}</strong>
                  <span>Signing out also signs you out of the content manager.</span>
                </div>
                <button className="secondary-button settings-action" onClick={signOut}>
                  Sign out <Icon name="logout" size={14} />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Schedule a walk">
          <button
            className="modal-backdrop"
            aria-label="Close walk dialog"
            tabIndex={-1}
            onClick={() => setModalOpen(false)}
          />
          <div className="booking-modal" ref={walkDialogRef} tabIndex={-1}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Shelter enrichment</p>
                <h2>Schedule a dog walk</h2>
                <span>New walks appear on the public site, where volunteers can book them.</span>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close">
                <Icon name="x" size={20} />
              </button>
            </div>
            {activeDogs.length === 0 ? (
              <div className="empty-state">
                <h3>No active dogs</h3>
                <p>Add a dog with a photo in the content manager before scheduling walks.</p>
                <a className="text-button" href={adminURL('dogs')}>
                  Open the content manager <Icon name="external" size={15} />
                </a>
              </div>
            ) : (
              <form onSubmit={addWalk}>
                <div className="field full">
                  <label htmlFor="dog">Dog</label>
                  <select
                    id="dog"
                    name="dog"
                    defaultValue={modalDogId || activeDogs[0].id}
                    required
                    data-autofocus
                  >
                    {activeDogs.map((dog) => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name} — {dog.breed}
                        {dog.kennel ? ` · Kennel ${dog.kennel}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="date">Date</label>
                  <input id="date" name="date" type="date" defaultValue={modalDate} required />
                </div>
                <div className="field">
                  <label htmlFor="time">Start time</label>
                  <input id="time" name="time" type="time" defaultValue="09:00" required />
                </div>
                <div className="field">
                  <label htmlFor="duration">Duration</label>
                  <select id="duration" name="duration" defaultValue={String(defaultDuration)}>
                    {WALK_DURATIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="route">
                    Approved walking route <span>Optional</span>
                  </label>
                  <select id="route" name="route" defaultValue={WALK_ROUTES[0].value}>
                    {WALK_ROUTES.map((route) => (
                      <option key={route.value} value={route.value}>
                        {route.label}
                      </option>
                    ))}
                    <option value="">No specific route</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="notes">
                    Handling notes <span>Optional · staff only</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    maxLength={500}
                    placeholder="Harness, behavior, medication, or handling instructions..."
                    rows={3}
                  />
                </div>
                {modalError && (
                  <p className="form-error full" role="alert">
                    {modalError}
                  </p>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={isPending}>
                    <Icon name="calendar" size={17} />
                    {isPending ? 'Saving…' : 'Schedule walk'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {detailsWalk && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Walk details">
          <button
            className="modal-backdrop"
            aria-label="Close walk details"
            tabIndex={-1}
            onClick={() => setDetailsWalkId(null)}
          />
          <div className="booking-modal" ref={detailsDialogRef} tabIndex={-1}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Walk details</p>
                <h2>
                  {detailsWalk.dogName} · {formatTime(detailsWalk.start)}
                </h2>
                <span>
                  {formatDay(detailsWalk.start, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · {detailsWalk.walk.durationMinutes} min
                </span>
              </div>
              <button onClick={() => setDetailsWalkId(null)} aria-label="Close">
                <Icon name="x" size={20} />
              </button>
            </div>
            <dl className="details-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`mini-status ${statusClass(detailsWalk.status)}`}>
                    {detailsWalk.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Kennel</dt>
                <dd>{detailsWalk.kennel}</dd>
              </div>
              <div>
                <dt>Approved route</dt>
                <dd>{detailsWalk.route ?? 'Not set'}</dd>
              </div>
              <div>
                <dt>Temperament</dt>
                <dd>{detailsWalk.dog?.temperament || '—'}</dd>
              </div>
              <div className="full">
                <dt>Handling notes</dt>
                <dd>{detailsWalk.walk.handlingNotes || 'None'}</dd>
              </div>
              {detailsWalk.walk.booking ? (
                <>
                  <div>
                    <dt>Volunteer</dt>
                    <dd>{detailsWalk.walk.booking.fullName}</dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd>
                      {EXPERIENCE_LABELS[detailsWalk.walk.booking.experience] ??
                        detailsWalk.walk.booking.experience}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${detailsWalk.walk.booking.email}`}>
                        {detailsWalk.walk.booking.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${detailsWalk.walk.booking.phone}`}>
                        {detailsWalk.walk.booking.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="full">
                    <dt>Note from the volunteer</dt>
                    <dd>{detailsWalk.walk.booking.notes || 'None'}</dd>
                  </div>
                  <div className="full">
                    <dt>Booked</dt>
                    <dd>
                      {new Date(detailsWalk.walk.booking.createdAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="full">
                  <dt>Volunteer</dt>
                  <dd>
                    {detailsWalk.walk.slotStatus === 'cancelled'
                      ? 'This walk is cancelled and hidden from the public site.'
                      : detailsWalk.start < now
                        ? 'Nobody booked this walk.'
                        : 'Nobody has booked this walk yet. Visitors can book it on the public site.'}
                  </dd>
                </div>
              )}
            </dl>
            <div className="details-actions">
              {detailsWalk.walk.booking && (
                <a
                  className="secondary-button settings-action"
                  href={adminURL('bookings', detailsWalk.walk.booking.id)}
                >
                  Edit booking <Icon name="external" size={14} />
                </a>
              )}
              <a
                className="secondary-button settings-action"
                href={adminURL('walk-slots', detailsWalk.id)}
              >
                Edit walk in content manager <Icon name="external" size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
