import { useMemo } from 'react'
import { Icon } from '@/components/icon'
import { WALK_STATUSES, type WalkStatus, statusClass } from '@/lib/walks'
import type { Calendar } from '../use-dashboard'
import {
  type WalkView,
  bySchedule,
  dateKey,
  formatDay,
  formatTime,
  statusOptionsFor,
} from '../walk-view'

/** The search text and status filter of the walk list. Kept by the dashboard across views. */
export type ScheduleFilter = { search: string; status: 'All' | WalkStatus }

export function ScheduleView({
  walks,
  calendar,
  todayKey,
  filter,
  onFilterChange,
  busyWalkId,
  onChangeStatus,
  onDelete,
  onShowDetails,
  onScheduleWalk,
}: {
  walks: WalkView[]
  calendar: Calendar
  todayKey: string
  filter: ScheduleFilter
  onFilterChange: (filter: ScheduleFilter) => void
  busyWalkId: string | null
  onChangeStatus: (walk: WalkView, status: WalkStatus) => void
  onDelete: (walk: WalkView) => void
  onShowDetails: (walkId: string) => void
  onScheduleWalk: () => void
}) {
  const { week, selectedDate } = calendar
  const selectedDay = new Date(`${selectedDate}T12:00:00`)

  const visibleWalks = useMemo(() => {
    const search = filter.search.trim().toLowerCase()
    return walks
      .filter((walk) => walk.date === selectedDate)
      .filter((walk) => filter.status === 'All' || walk.status === filter.status)
      .filter((walk) =>
        `${walk.dogName} ${walk.kennel} ${walk.route ?? ''} ${walk.walker} ${walk.walk.booking?.email ?? ''}`
          .toLowerCase()
          .includes(search),
      )
      .toSorted(bySchedule)
  }, [walks, filter, selectedDate])

  return (
    <section className="schedule-card">
      <div className="schedule-toolbar">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>
            {formatDay(week.start, { month: 'long', day: 'numeric' })} –{' '}
            {formatDay(week.end, { month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="calendar-controls">
          <button onClick={() => calendar.moveWeek(-1)} aria-label="Previous week">
            <Icon name="chevron-left" size={18} />
          </button>
          <button className="today-button" onClick={() => calendar.goToDate(new Date())}>
            Today
          </button>
          <button onClick={() => calendar.moveWeek(1)} aria-label="Next week">
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>

      <div className="week-strip">
        {week.days.map((date) => {
          const key = dateKey(date)
          const count = walks.filter((walk) => walk.date === key).length
          return (
            <button
              key={key}
              className={`${selectedDate === key ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`.trim()}
              onClick={() => calendar.setSelectedDate(key)}
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
              value={filter.search}
              onChange={(event) => onFilterChange({ ...filter, search: event.target.value })}
              placeholder="Search schedule"
            />
          </label>
          <select
            value={filter.status}
            onChange={(event) =>
              onFilterChange({ ...filter, status: event.target.value as ScheduleFilter['status'] })
            }
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
                      onClick={() => onShowDetails(walk.id)}
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
                  onChange={(event) => onChangeStatus(walk, event.target.value as WalkStatus)}
                >
                  {statusOptionsFor(walk).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <button
                  className="delete-button"
                  onClick={() => onDelete(walk)}
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
            <button className="text-button" onClick={onScheduleWalk}>
              <Icon name="plus" size={17} /> Schedule a walk
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
