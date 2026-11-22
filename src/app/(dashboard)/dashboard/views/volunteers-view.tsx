import { Icon } from '@/components/icon'
import { experienceLabel } from '@/lib/booking-rules'
import {
  type Volunteer,
  type Week,
  formatDay,
  initialsOf,
  isInWeek,
  nextWalkFor,
} from '../walk-view'

export function VolunteersView({
  volunteers,
  week,
  now,
  onViewSchedule,
}: {
  volunteers: Volunteer[]
  week: Week
  now: Date
  /** Opens the schedule, on `date` when given. */
  onViewSchedule: (date?: Date) => void
}) {
  if (volunteers.length === 0) {
    return (
      <section className="panel">
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="users" size={30} />
          </span>
          <h3>No volunteers yet</h3>
          <p>People who book a walk on the public site will appear here.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="walker-grid">
      {volunteers.map((volunteer, index) => {
        const active = volunteer.walks.filter((walk) => walk.status !== 'Cancelled')
        const thisWeek = active.filter((walk) => isInWeek(walk, week))
        const nextWalk = nextWalkFor(active, now)
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
              <span className="available-badge">{experienceLabel(volunteer.experience)}</span>
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
            <button className="profile-action" onClick={() => onViewSchedule(nextWalk?.start)}>
              View schedule <Icon name="chevron-right" size={15} />
            </button>
          </article>
        )
      })}
    </section>
  )
}
