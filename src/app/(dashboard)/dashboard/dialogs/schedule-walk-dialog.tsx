import { type FormEvent, useState, useTransition } from 'react'
import { Icon } from '@/components/icon'
import { useModalDialog } from '@/lib/use-modal-dialog'
import { HANDLING_NOTES_MAX, WALK_DURATIONS, WALK_ROUTES } from '@/lib/walks'
import { createWalk } from '../actions'
import type { DashboardDog } from '../types'
import { SIGN_IN_PAGE } from '../use-dashboard'
import { adminURL } from '../walk-view'

/** "Schedule a walk": creates an open walk that visitors can book on the public site. */
export function ScheduleWalkDialog({
  dogs,
  initialDogId,
  initialDate,
  defaultDuration,
  onClose,
  onScheduled,
}: {
  /** The active dogs, which can get walks. */
  dogs: DashboardDog[]
  initialDogId: string
  /** "YYYY-MM-DD" */
  initialDate: string
  defaultDuration: number
  onClose: () => void
  onScheduled: (start: Date, message?: string) => void
}) {
  const dialogRef = useModalDialog<HTMLDivElement>(true, onClose)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '')
    const time = String(form.get('time') ?? '')
    const start = new Date(`${date}T${time}`)
    if (!date || !time || Number.isNaN(start.getTime())) {
      setError('Choose a valid date and start time.')
      return
    }
    setError('')
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
          if (result.signedOut) window.location.assign(SIGN_IN_PAGE)
          else setError(result.message)
          return
        }
        onScheduled(start, result.message)
      } catch {
        setError('Could not reach the server. Please try again.')
      }
    })
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Schedule a walk">
      <button
        className="modal-backdrop"
        aria-label="Close walk dialog"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="booking-modal" ref={dialogRef} tabIndex={-1}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Shelter enrichment</p>
            <h2>Schedule a dog walk</h2>
            <span>New walks appear on the public site, where volunteers can book them.</span>
          </div>
          <button onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>
        {dogs.length === 0 ? (
          <div className="empty-state">
            <h3>No active dogs</h3>
            <p>Add a dog with a photo in the content manager before scheduling walks.</p>
            <a className="text-button" href={adminURL('dogs')}>
              Open the content manager <Icon name="external" size={15} />
            </a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field full">
              <label htmlFor="dog">Dog</label>
              <select
                id="dog"
                name="dog"
                defaultValue={initialDogId || dogs[0].id}
                required
                data-autofocus
              >
                {dogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} — {dog.breed}
                    {dog.kennel ? ` · Kennel ${dog.kennel}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input id="date" name="date" type="date" defaultValue={initialDate} required />
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
                maxLength={HANDLING_NOTES_MAX}
                placeholder="Harness, behavior, medication, or handling instructions..."
                rows={3}
              />
            </div>
            {error && (
              <p className="form-error full" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={onClose}>
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
  )
}
