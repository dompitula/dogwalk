import { Icon } from '@/components/icon'
import { experienceLabel } from '@/lib/booking-rules'
import { useModalDialog } from '@/lib/use-modal-dialog'
import { statusClass } from '@/lib/walks'
import { type WalkView, adminURL, formatDay, formatTime } from '../walk-view'

/** Everything about one walk and its booking, with links to edit them in the content manager. */
export function WalkDetailsDialog({
  walk,
  now,
  onClose,
}: {
  walk: WalkView
  now: Date
  onClose: () => void
}) {
  const dialogRef = useModalDialog<HTMLDivElement>(true, onClose)
  const booking = walk.walk.booking

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Walk details">
      <button
        className="modal-backdrop"
        aria-label="Close walk details"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="booking-modal" ref={dialogRef} tabIndex={-1}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Walk details</p>
            <h2>
              {walk.dogName} · {formatTime(walk.start)}
            </h2>
            <span>
              {formatDay(walk.start, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · {walk.walk.durationMinutes} min
            </span>
          </div>
          <button onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>
        <dl className="details-list">
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`mini-status ${statusClass(walk.status)}`}>{walk.status}</span>
            </dd>
          </div>
          <div>
            <dt>Kennel</dt>
            <dd>{walk.kennel}</dd>
          </div>
          <div>
            <dt>Approved route</dt>
            <dd>{walk.route ?? 'Not set'}</dd>
          </div>
          <div>
            <dt>Temperament</dt>
            <dd>{walk.dog?.temperament || '—'}</dd>
          </div>
          <div className="full">
            <dt>Special care</dt>
            <dd>{walk.dog?.specialCare.join(', ') || 'None recorded'}</dd>
          </div>
          <div className="full">
            <dt>Care instructions</dt>
            <dd>{walk.dog?.careNotes || 'None recorded'}</dd>
          </div>
          <div className="full">
            <dt>Handling notes</dt>
            <dd>{walk.walk.handlingNotes || 'None'}</dd>
          </div>
          {booking ? (
            <>
              <div>
                <dt>Volunteer</dt>
                <dd>{booking.fullName}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{experienceLabel(booking.experience)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${booking.email}`}>{booking.email}</a>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${booking.phone}`}>{booking.phone}</a>
                </dd>
              </div>
              <div className="full">
                <dt>Note from the volunteer</dt>
                <dd>{booking.notes || 'None'}</dd>
              </div>
              <div className="full">
                <dt>Booked</dt>
                <dd>
                  {new Date(booking.createdAt).toLocaleString('en-US', {
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
                {walk.walk.slotStatus === 'cancelled'
                  ? 'This walk is cancelled and hidden from the public site.'
                  : walk.start < now
                    ? 'Nobody booked this walk.'
                    : 'Nobody has booked this walk yet. Visitors can book it on the public site.'}
              </dd>
            </div>
          )}
        </dl>
        <div className="details-actions">
          {booking && (
            <a className="secondary-button settings-action" href={adminURL('bookings', booking.id)}>
              Edit booking <Icon name="external" size={14} />
            </a>
          )}
          <a className="secondary-button settings-action" href={adminURL('walk-slots', walk.id)}>
            Edit walk in content manager <Icon name="external" size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
