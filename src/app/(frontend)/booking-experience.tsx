'use client'

import Image from 'next/image'
import { type FormEvent, startTransition, useActionState, useMemo, useState } from 'react'
import { Icon } from '@/components/icon'
import { BOOKING_LIMITS, EXPERIENCE_OPTIONS } from '@/lib/booking-rules'
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
    const requestedWalk = walks.find((walk) => walk.id === state.slot) ?? selected
    return (
      <section
        id="walks"
        aria-labelledby="request-heading"
        className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-sage-300 bg-white shadow-card">
          <div className="border-b border-sage-200 bg-sage-100 px-6 py-8 sm:px-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs font-semibold text-forest-700">
              <Icon name="check" size={14} /> Request received
            </div>
            <h2
              id="request-heading"
              className="font-serif text-3xl leading-tight text-forest-900 sm:text-4xl"
            >
              Thanks{state.firstName ? ', ' + state.firstName : ''}. You are on the list.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-moss-500">
              Your request is saved. The shelter will get in touch to approve your walk and share
              arrival details.
            </p>
          </div>
          <div className="px-6 py-7 sm:px-10">
            {requestedWalk && (
              <div className="flex items-center gap-4 rounded-2xl border border-sage-200 bg-sand-50 p-4">
                <Image
                  src={requestedWalk.dog.photo.url}
                  alt={requestedWalk.dog.photo.alt}
                  width={80}
                  height={80}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs text-moss-500">Your walking companion</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-forest-900">
                    {requestedWalk.dog.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-moss-500">
                    {formatDay(requestedWalk.startsAt)} &middot;{' '}
                    {formatTime(requestedWalk.startsAt)} &middot; {requestedWalk.durationMinutes}{' '}
                    min
                  </p>
                  <p className="text-xs leading-5 text-moss-500">{requestedWalk.shelter.name}</p>
                </div>
              </div>
            )}
            <div className="mt-7 grid gap-6 sm:grid-cols-2" role="status">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-forest-900">
                    {state.emailSent ? 'Check your inbox' : 'Your request is safe'}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-moss-500">
                    {state.emailSent
                      ? 'We sent a receipt for your request. Check your spam folder too.'
                      : 'The email could not be sent, but your request is saved. There is no need to book again.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-forest-900">Wait for the shelter</h3>
                  <p className="mt-1 text-xs leading-5 text-moss-500">
                    Your walk is awaiting approval. The team will contact you to confirm.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-sage-200 pt-6">
              <span className="inline-flex items-center gap-2 text-xs text-moss-500">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> Awaiting shelter approval
              </span>
              <a
                href="#top"
                className="inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-forest-800"
              >
                Back to home <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
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
            <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] text-forest-900 sm:text-5xl">
              Pick your walking companion.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-moss-500">
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
                className="group overflow-hidden rounded-[1.75rem] border border-sage-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-raised"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-forest-100">
                  <Image
                    src={walk.dog.photo.url}
                    alt={walk.dog.photo.alt}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-forest-800 shadow-sm backdrop-blur">
                    {walk.dog.energy === 'high'
                      ? 'High energy'
                      : walk.dog.energy[0].toUpperCase() + walk.dog.energy.slice(1)}
                  </span>
                  <span className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-forest-900 px-3 py-1.5 text-xs font-bold text-white">
                    <Icon name="paw" size={14} /> {walk.dog.size}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-3xl text-forest-900">{walk.dog.name}</h3>
                  <p className="mt-1 text-sm font-medium text-moss-500">
                    {walk.dog.ageLabel} · {walk.dog.breed}
                  </p>
                  <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-moss-600">
                    {walk.dog.bio}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {walk.dog.traits.slice(0, 3).map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-sage-100 px-2.5 py-1 text-[11px] font-bold text-moss-600"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-sand-100 pt-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-pine-800">
                      <Icon name="calendar" size={16} className="text-coral-500" />
                      {formatDay(walk.startsAt)} at {formatTime(walk.startsAt)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-moss-500">
                      <Icon name="map" size={16} />
                      {walk.shelter.name} · {walk.shelter.neighborhood}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(walk)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-forest-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-coral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-900"
                  >
                    Book this walk <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[1.75rem] border border-dashed border-sage-400 bg-sage-50 px-6 py-16 text-center">
            <Icon name="paw" size={36} className="mx-auto text-coral-500" />
            <h3 className="mt-4 font-serif text-2xl text-forest-900">
              No matching walks right now
            </h3>
            <p className="mt-2 text-sm text-moss-500">
              Try another filter or check back soon for newly added times.
            </p>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-title"
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-cream shadow-2xl outline-none sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between border-b border-sage-200 px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow">One last step</p>
                <h2 id="booking-title" className="mt-1 font-serif text-3xl text-forest-900">
                  Walk with {selected.dog.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-xl text-pine-800"
                aria-label="Close booking form"
              >
                ×
              </button>
            </div>
            <div className="grid gap-0 md:grid-cols-[.8fr_1.2fr]">
              <div className="bg-sage-100 p-6 sm:p-8">
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src={selected.dog.photo.url}
                    alt={selected.dog.photo.alt}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </div>
                <div className="mt-5 space-y-3 text-sm text-moss-700">
                  <p className="flex gap-2">
                    <Icon name="calendar" className="shrink-0 text-coral-500" />{' '}
                    <span>
                      <strong className="block text-forest-900">
                        {formatDay(selected.startsAt)}
                      </strong>
                      {formatTime(selected.startsAt)} · {selected.durationMinutes} min
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <Icon name="map" className="shrink-0 text-coral-500" />{' '}
                    <span>
                      <strong className="block text-forest-900">{selected.shelter.name}</strong>
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
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.visitorLabel}
                      </option>
                    ))}
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
                    maxLength={BOOKING_LIMITS.notes.max}
                    defaultValue={values?.notes}
                    placeholder="Accessibility needs, questions, or a note for the team"
                  />
                </label>
                {result?.message && (
                  <p
                    role="alert"
                    className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-800"
                  >
                    {result.message}
                  </p>
                )}
                <button
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-coral-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-coral-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? 'Reserving your walk…' : 'Confirm walk'}{' '}
                  <Icon name="check" size={16} />
                </button>
                <p className="text-center text-[11px] leading-5 text-moss-500">
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
