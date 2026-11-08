'use client'

import Image from 'next/image'
import { type FormEvent, startTransition, useActionState, useMemo, useState } from 'react'
import { useModalDialog } from '@/lib/use-modal-dialog'
import { createBooking, type BookingResult } from './actions'

export type WalkOption = {
  id: string
  startsAt: string
  durationMinutes: number
  dog: {
    name: string
    breed: string
    ageLabel: string
    size: 'small' | 'medium' | 'large'
    energy: 'easygoing' | 'moderate' | 'high'
    bio: string
    traits: string[]
    photo: { url: string; alt: string; width?: number | null; height?: number | null }
  }
  shelter: {
    name: string
    neighborhood: string
    address: string
  }
}

const initialState: BookingResult = { success: false, message: '' }

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: 'arrow' | 'calendar' | 'check' | 'clock' | 'heart' | 'map' | 'paw' | 'spark'
  className?: string
}) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15m6-12v15" />
      </>
    ),
    paw: (
      <>
        <circle cx="12" cy="15" r="4" />
        <circle cx="6.5" cy="10" r="2" />
        <circle cx="10" cy="6" r="2" />
        <circle cx="14.5" cy="6.5" r="2" />
        <circle cx="18" cy="10.5" r="2" />
      </>
    ),
    spark: (
      <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

const formatDay = (date: string) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(date),
  )

const formatTime = (date: string) =>
  new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(date))

export function BookingExperience({ walks }: { walks: WalkOption[] }) {
  const [size, setSize] = useState('all')
  const [energy, setEnergy] = useState('all')
  const [selected, setSelected] = useState<WalkOption | null>(null)
  const [state, action, pending] = useActionState(createBooking, initialState)
  const dialogRef = useModalDialog<HTMLDivElement>(selected !== null && !state.success, () =>
    setSelected(null),
  )
  // Errors belong to the walk they were made on; typed values carry over to any walk.
  const result = selected && state.slot === selected.id ? state : null
  const values = state.values

  // Submitted from onSubmit rather than <form action>: React clears a form after a form
  // action runs, which would wipe what the visitor typed whenever there is an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => action(formData))
  }

  const filtered = useMemo(
    () =>
      walks.filter(
        (walk) =>
          (size === 'all' || walk.dog.size === size) &&
          (energy === 'all' || walk.dog.energy === energy),
      ),
    [walks, size, energy],
  )

  if (state.success) {
    return (
      <section id="walks" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#dce9df] bg-[#f3f9f3] px-6 py-14 text-center shadow-[0_20px_70px_rgba(31,66,44,.08)] sm:px-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#205c3b] text-white">
            <Icon name="check" className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#db5d3f]">
            Walk reserved
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[#173f2b]">
            A good day is on the calendar.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-[#577061]">
            {state.message}
          </p>
          <a
            href="#top"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173f2b] px-6 py-3 text-sm font-bold text-white"
          >
            Back to the top <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </section>
    )
  }

  return (
    <>
      <section id="walks" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Dogs ready for a stroll</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] text-[#173f2b] sm:text-5xl">
              Pick your walking companion.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#627568]">
              Every walk gives a shelter dog fresh air, practice, and a better chance of meeting
              their person.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="filter-control">
              <span>Size</span>
              <select value={size} onChange={(event) => setSize(event.target.value)}>
                <option value="all">Any size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label className="filter-control">
              <span>Energy</span>
              <select value={energy} onChange={(event) => setEnergy(event.target.value)}>
                <option value="all">Any energy</option>
                <option value="easygoing">Easygoing</option>
                <option value="moderate">Moderate</option>
                <option value="high">High energy</option>
              </select>
            </label>
          </div>
        </div>

        {filtered.length ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((walk) => (
              <article
                key={walk.id}
                className="group overflow-hidden rounded-[1.75rem] border border-[#e1e8e2] bg-white shadow-[0_14px_50px_rgba(30,62,43,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(30,62,43,.13)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#e9efe9]">
                  <Image
                    src={walk.dog.photo.url}
                    alt={walk.dog.photo.alt}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#205c3b] shadow-sm backdrop-blur">
                    {walk.dog.energy === 'high'
                      ? 'High energy'
                      : walk.dog.energy[0].toUpperCase() + walk.dog.energy.slice(1)}
                  </span>
                  <span className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-[#173f2b] px-3 py-1.5 text-xs font-bold text-white">
                    <Icon name="paw" className="h-3.5 w-3.5" /> {walk.dog.size}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-3xl text-[#173f2b]">{walk.dog.name}</h3>
                      <p className="mt-1 text-sm font-medium text-[#738278]">
                        {walk.dog.ageLabel} · {walk.dog.breed}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0ea] text-[#db5d3f]">
                      <Icon name="heart" className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-[#576b5e]">
                    {walk.dog.bio}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {walk.dog.traits.slice(0, 3).map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-[#f3f6f3] px-2.5 py-1 text-[11px] font-bold text-[#557060]"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-[#edf0ed] pt-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#294c37]">
                      <Icon name="calendar" className="h-4 w-4 text-[#db5d3f]" />
                      {formatDay(walk.startsAt)} at {formatTime(walk.startsAt)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#75847a]">
                      <Icon name="map" className="h-4 w-4" />
                      {walk.shelter.name} · {walk.shelter.neighborhood}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(walk)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#173f2b] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#db5d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f2b]"
                  >
                    Book this walk <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[1.75rem] border border-dashed border-[#cdd9cf] bg-[#f7faf7] px-6 py-16 text-center">
            <Icon name="paw" className="mx-auto h-9 w-9 text-[#db5d3f]" />
            <h3 className="mt-4 font-serif text-2xl text-[#173f2b]">No matching walks right now</h3>
            <p className="mt-2 text-sm text-[#6b7d70]">
              Try another filter or check back soon for newly added times.
            </p>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#102b1d]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-title"
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-[#fffdfa] shadow-2xl outline-none sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between border-b border-[#e8ede8] px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow">One last step</p>
                <h2 id="booking-title" className="mt-1 font-serif text-3xl text-[#173f2b]">
                  Walk with {selected.dog.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ee] text-xl text-[#274d36]"
                aria-label="Close booking form"
              >
                ×
              </button>
            </div>
            <div className="grid gap-0 md:grid-cols-[.8fr_1.2fr]">
              <div className="bg-[#f0f6f1] p-6 sm:p-8">
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src={selected.dog.photo.url}
                    alt={selected.dog.photo.alt}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </div>
                <div className="mt-5 space-y-3 text-sm text-[#45604e]">
                  <p className="flex gap-2">
                    <Icon name="calendar" className="h-5 w-5 text-[#db5d3f]" />{' '}
                    <span>
                      <strong className="block text-[#173f2b]">
                        {formatDay(selected.startsAt)}
                      </strong>
                      {formatTime(selected.startsAt)} · {selected.durationMinutes} min
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <Icon name="map" className="h-5 w-5 text-[#db5d3f]" />{' '}
                    <span>
                      <strong className="block text-[#173f2b]">{selected.shelter.name}</strong>
                      {selected.shelter.address}
                    </span>
                  </p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
                <input type="hidden" name="slot" value={selected.id} />
                <Field
                  label="Full name"
                  name="fullName"
                  error={result?.errors?.fullName}
                  defaultValue={values?.fullName}
                  autoComplete="name"
                  autofocus
                />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  error={result?.errors?.email}
                  defaultValue={values?.email}
                  autoComplete="email"
                />
                <Field
                  label="Phone number"
                  name="phone"
                  type="tel"
                  error={result?.errors?.phone}
                  defaultValue={values?.phone}
                  autoComplete="tel"
                />
                <label className="form-field">
                  <span>Dog walking experience</span>
                  <select name="experience" defaultValue={values?.experience ?? ''} required>
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="first-time">This is my first time</option>
                    <option value="some">I have some experience</option>
                    <option value="experienced">I’m an experienced walker</option>
                  </select>
                  {result?.errors?.experience && <small>{result.errors.experience}</small>}
                </label>
                <label className="form-field">
                  <span>
                    Anything the shelter should know? <em>Optional</em>
                  </span>
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={500}
                    defaultValue={values?.notes}
                    placeholder="Accessibility needs, questions, or a note for the team"
                  />
                </label>
                {result?.message && (
                  <p
                    role="alert"
                    className="rounded-xl bg-[#fff0ea] px-4 py-3 text-sm font-medium text-[#9f3f2a]"
                  >
                    {result.message}
                  </p>
                )}
                <button
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#db5d3f] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#c84e32] disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? 'Reserving your walk…' : 'Confirm walk'}{' '}
                  <Icon name="check" className="h-4 w-4" />
                </button>
                <p className="text-center text-[11px] leading-5 text-[#7a887e]">
                  The shelter will contact you to confirm the walk and arrival details. Please bring
                  a photo ID.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  name,
  error,
  defaultValue,
  type = 'text',
  autoComplete,
  autofocus = false,
}: {
  label: string
  name: string
  error?: string
  defaultValue?: string
  type?: string
  autoComplete?: string
  /** Receives focus when the booking dialog opens. */
  autofocus?: boolean
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        data-autofocus={autofocus || undefined}
      />
      {error && <small>{error}</small>}
    </label>
  )
}
