import { Icon } from '@/components/icon'
import { ENERGY_LABELS } from '@/lib/walks'
import type { DashboardDog } from '../types'
import { type WalkView, FALLBACK_PHOTO, adminURL, formatDay, nextWalkFor } from '../walk-view'

export function DogsView({
  dogs,
  walks,
  now,
  onScheduleWalk,
}: {
  dogs: DashboardDog[]
  walks: WalkView[]
  now: Date
  onScheduleWalk: (dogId: string) => void
}) {
  if (dogs.length === 0) {
    return (
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
    )
  }

  return (
    <section className="directory-grid">
      {dogs.map((dog) => {
        const dogWalks = walks.filter((walk) => walk.dog?.id === dog.id)
        const nextWalk = nextWalkFor(dogWalks, now)
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
                  <span>Energy</span>
                  <strong>{ENERGY_LABELS[dog.energy] ?? dog.energy}</strong>
                </div>
                <div>
                  <span>Age</span>
                  <strong>{dog.ageLabel}</strong>
                </div>
                <div>
                  <span>Special care</span>
                  <strong>{dog.specialCare.join(', ') || 'None recorded'}</strong>
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
                <button className="profile-action" onClick={() => onScheduleWalk(dog.id)}>
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
  )
}
