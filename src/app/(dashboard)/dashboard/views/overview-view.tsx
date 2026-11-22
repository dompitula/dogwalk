import { Icon } from '@/components/icon'
import { WALK_STATUSES, statusClass } from '@/lib/walks'
import { type WalkView, type Week, bySchedule, dateKey, formatDay, isInWeek } from '../walk-view'

export function OverviewView({
  walks,
  week,
  now,
  activeDogCount,
  onOpenSchedule,
  onShowDetails,
}: {
  walks: WalkView[]
  week: Week
  now: Date
  activeDogCount: number
  onOpenSchedule: () => void
  onShowDetails: (walkId: string) => void
}) {
  const todayKey = dateKey(now)
  const thisWeekWalks = walks.filter((walk) => isInWeek(walk, week))
  const upcomingWalks = walks
    .filter((walk) => walk.date >= todayKey && walk.status !== 'Cancelled')
    .toSorted(bySchedule)
  const pendingCount = thisWeekWalks.filter((walk) => walk.status === 'Pending').length
  const openCount = thisWeekWalks.filter((walk) => walk.status === 'Needs Volunteer').length

  return (
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
            <strong>{activeDogCount} shelter dogs</strong>
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
            <button className="text-button" onClick={onOpenSchedule}>
              View schedule <Icon name="chevron-right" size={15} />
            </button>
          </div>
          <div className="upcoming-list">
            {upcomingWalks.slice(0, 5).map((walk) => (
              <div className="upcoming-item" key={walk.id}>
                <img src={walk.image} alt="" />
                <div>
                  <strong>
                    <button className="link-button" onClick={() => onShowDetails(walk.id)}>
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
  )
}
