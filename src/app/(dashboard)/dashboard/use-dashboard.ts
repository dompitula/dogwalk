import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WALK_DURATIONS, type WalkStatus } from '@/lib/walks'
import { removeWalk, setWalkStatus } from './actions'
import type { ActionResult, DashboardData } from './types'
import {
  type WalkView,
  dateKey,
  getWeekStart,
  groupVolunteers,
  toWalkViews,
  weekOf,
} from './walk-view'

/** The message bar under the page title. Success messages close by themselves. */
export type Notice = { kind: 'success' | 'error'; text: string }

export const SIGN_IN_PAGE = '/dashboard/login'

/**
 * The dashboard's shared data and walk actions: walks joined with their dogs and
 * bookings, the active dogs, the volunteers, the message bar, and status changes and
 * removals. A changed status shows at once and is undone if the server refuses it.
 */
export function useDashboardData(data: DashboardData) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busyWalkId, setBusyWalkId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WalkStatus>>({})
  const [notice, setNotice] = useState<Notice | null>(null)

  // Fresh data from the server replaces any status shown optimistically. `data` only changes
  // when the server sends new data (router.refresh), so this cannot loop.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- runs only when the server sends new data
    setStatusOverrides({})
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `data` is the trigger, not an input
  }, [data])

  useEffect(() => {
    if (notice?.kind !== 'success') return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const walks = useMemo(() => toWalkViews(data, statusOverrides), [data, statusOverrides])
  const activeDogs = useMemo(() => data.dogs.filter((dog) => dog.active), [data.dogs])
  const volunteers = useMemo(() => groupVolunteers(walks), [walks])

  /** Shows the result of an action; `true` when it succeeded. */
  function handleResult(result: ActionResult) {
    if (!result.ok && result.signedOut) {
      window.location.assign(SIGN_IN_PAGE)
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
      runWalkAction(walk.id, () => removeWalk(walk.id))
    }
  }

  return {
    walks,
    activeDogs,
    volunteers,
    notice,
    setNotice,
    busyWalkId,
    changeStatus,
    deleteWalk,
  }
}

/** The week shown in the Schedule view and the selected day in it. */
export function useCalendar() {
  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const week = useMemo(() => weekOf(weekStart), [weekStart])

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

  return { week, selectedDate, setSelectedDate, goToDate, moveWeek }
}

export type Calendar = ReturnType<typeof useCalendar>

// Kept from the app's former name, so durations saved in browsers before the rename still apply.
const DURATION_STORAGE_KEY = 'shelterwalk-default-duration'

/** The walk duration preselected when scheduling a walk, saved in this browser. */
export function useDefaultDuration() {
  const [duration, setDuration] = useState<number>(45)

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(DURATION_STORAGE_KEY))
      // oxlint-disable-next-line react/set-state-in-effect -- runs once: browser storage cannot be read during the server render
      if ((WALK_DURATIONS as readonly number[]).includes(stored)) setDuration(stored)
    } catch {
      // Storage can be unavailable (private mode); the default stays at 45 minutes.
    }
  }, [])

  function saveDuration(value: number) {
    setDuration(value)
    try {
      window.localStorage.setItem(DURATION_STORAGE_KEY, String(value))
    } catch {
      // Ignore storage errors; the choice still applies until the page is reloaded.
    }
  }

  return [duration, saveDuration] as const
}

/** Signs out of the dashboard and the content manager (they share the session). */
export async function signOut() {
  try {
    await fetch('/api/admins/logout', { method: 'POST', credentials: 'include' })
  } finally {
    window.location.assign(SIGN_IN_PAGE)
  }
}
