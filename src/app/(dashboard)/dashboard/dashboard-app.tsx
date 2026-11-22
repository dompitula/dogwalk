'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { ScheduleWalkDialog } from './dialogs/schedule-walk-dialog'
import { WalkDetailsDialog } from './dialogs/walk-details-dialog'
import { Sidebar } from './sidebar'
import type { DashboardData } from './types'
import { signOut, useCalendar, useDashboardData, useDefaultDuration } from './use-dashboard'
import { DogsView } from './views/dogs-view'
import { OverviewView } from './views/overview-view'
import { type ScheduleFilter, ScheduleView } from './views/schedule-view'
import { SettingsView } from './views/settings-view'
import { VolunteersView } from './views/volunteers-view'
import { type NavView, dateKey } from './walk-view'

/**
 * The staff dashboard (/dashboard): the sidebar, the page header and message bar, the
 * view picked in the sidebar (views/), and the dialogs (dialogs/). The data and the walk
 * actions are in use-dashboard.ts.
 */
export function DashboardApp({ data }: { data: DashboardData }) {
  const router = useRouter()
  const dashboard = useDashboardData(data)
  const calendar = useCalendar()
  const [defaultDuration, saveDefaultDuration] = useDefaultDuration()
  const [mounted, setMounted] = useState(false)
  const [activeView, setActiveView] = useState<NavView>('Schedule')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>({
    search: '',
    status: 'All',
  })
  /** The "Schedule a walk" dialog's starting values while it is open. */
  const [newWalk, setNewWalk] = useState<{ dogId: string; date: string } | null>(null)
  const [detailsWalkId, setDetailsWalkId] = useState<string | null>(null)

  // The dashboard depends on the viewer's clock and time zone, so it renders in the browser only.
  useEffect(() => {
    setMounted(true)
    // After adding a dog, the content manager opens /dashboard?view=dogs&created=1.
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') !== 'dogs') return
    setActiveView('Dogs')
    if (params.get('created') === '1') {
      dashboard.setNotice({ kind: 'success', text: 'Dog added successfully.' })
      params.delete('created')
      window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    }
    // Runs once, on the first render in the browser (setNotice never changes).
  }, [])

  if (!mounted) {
    return (
      <div className="app-loading" role="status">
        Loading dashboard…
      </div>
    )
  }

  const now = new Date()
  const todayKey = dateKey(now)
  const { notice, setNotice } = dashboard
  const detailsWalk = dashboard.walks.find((walk) => walk.id === detailsWalkId) ?? null

  function openView(view: NavView) {
    setActiveView(view)
    setSidebarOpen(false)
  }

  function openScheduleWalk(dogId = '') {
    setNewWalk({
      dogId: dashboard.activeDogs.some((dog) => dog.id === dogId) ? dogId : '',
      date: calendar.selectedDate >= todayKey ? calendar.selectedDate : todayKey,
    })
  }

  function walkScheduled(start: Date, message?: string) {
    setNewWalk(null)
    calendar.goToDate(start)
    setActiveView('Schedule')
    if (message) setNotice({ kind: 'success', text: message })
    router.refresh()
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        open={sidebarOpen}
        staffEmail={data.staffEmail}
        onNavigate={openView}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOut}
      />

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div>
            <p className="eyebrow">Shelter enrichment</p>
            <h1>{activeView === 'Schedule' ? 'Weekly schedule' : activeView}</h1>
          </div>
          <button className="primary-button top-action" onClick={() => openScheduleWalk()}>
            <Icon name="plus" size={18} />
            Schedule a walk
          </button>
        </header>

        {notice && (
          <div
            className={`notice ${notice.kind}`}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss message">
              <Icon name="x" size={15} />
            </button>
          </div>
        )}

        {activeView === 'Overview' && (
          <OverviewView
            walks={dashboard.walks}
            week={calendar.week}
            now={now}
            activeDogCount={dashboard.activeDogs.length}
            onOpenSchedule={() => openView('Schedule')}
            onShowDetails={setDetailsWalkId}
          />
        )}
        {activeView === 'Schedule' && (
          <ScheduleView
            walks={dashboard.walks}
            calendar={calendar}
            todayKey={todayKey}
            filter={scheduleFilter}
            onFilterChange={setScheduleFilter}
            busyWalkId={dashboard.busyWalkId}
            onChangeStatus={dashboard.changeStatus}
            onDelete={dashboard.deleteWalk}
            onShowDetails={setDetailsWalkId}
            onScheduleWalk={() => openScheduleWalk()}
          />
        )}
        {activeView === 'Dogs' && (
          <DogsView
            dogs={data.dogs}
            walks={dashboard.walks}
            now={now}
            onScheduleWalk={openScheduleWalk}
          />
        )}
        {activeView === 'Volunteers' && (
          <VolunteersView
            volunteers={dashboard.volunteers}
            week={calendar.week}
            now={now}
            onViewSchedule={(date) => {
              if (date) calendar.goToDate(date)
              openView('Schedule')
            }}
          />
        )}
        {activeView === 'Settings' && (
          <SettingsView
            staffEmail={data.staffEmail}
            defaultDuration={defaultDuration}
            onDefaultDurationChange={saveDefaultDuration}
            onSignOut={signOut}
          />
        )}
      </main>

      {newWalk && (
        <ScheduleWalkDialog
          dogs={dashboard.activeDogs}
          initialDogId={newWalk.dogId}
          initialDate={newWalk.date}
          defaultDuration={defaultDuration}
          onClose={() => setNewWalk(null)}
          onScheduled={walkScheduled}
        />
      )}
      {detailsWalk && (
        <WalkDetailsDialog walk={detailsWalk} now={now} onClose={() => setDetailsWalkId(null)} />
      )}
    </div>
  )
}
