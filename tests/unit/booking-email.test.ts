import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildBookingEmail } from '@/lib/email/booking-email'

// The real sharp, wrapped in a spy to see which files it is asked to read.
vi.mock('sharp', async (importOriginal) => {
  const { default: realSharp } = await importOriginal<{ default: typeof sharp }>()
  return { default: vi.fn(realSharp) }
})

type Walk = {
  id: number
  startsAt: string
  durationMinutes: number
  dog: { name: string; breed: string; photo: { filename: string } | null } | null
  shelter: { name: string; address: string } | null
}

const baseWalk = (): Walk => ({
  id: 7,
  // 12:00 in Warsaw (summer time, UTC+2), 06:00 in New York (UTC-4).
  startsAt: '2026-07-01T10:00:00.000Z',
  durationMinutes: 45,
  dog: { name: 'Milo', breed: 'Golden Retriever', photo: null },
  shelter: { name: 'Riverside Animal Shelter', address: '24 Willow Lane' },
})

function fakePayload(walk: Walk, settings: { timeZone?: string | null } = {}) {
  const payload = {
    findByID: vi.fn(async () => walk),
    findGlobal: vi.fn(async () => settings),
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  }
  return { payload, asPayload: payload as unknown as Payload }
}

const build = (walk: Walk, options: { kind?: 'request' | 'approved' | 'cancelled' } = {}) => {
  const { payload, asPayload } = fakePayload(walk, { timeZone: 'Europe/Warsaw' })
  return { payload, email: buildBookingEmail(asPayload, walk.id, 'Maya Chen', false, options.kind) }
}

const sharpInputs = () => vi.mocked(sharp).mock.calls.map((call) => call[0])

beforeEach(() => {
  vi.mocked(sharp).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('buildBookingEmail', () => {
  it('loads the walk and the email settings', async () => {
    const { payload, email } = build(baseWalk())
    await email
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'walk-slots', id: 7, depth: 2, overrideAccess: true }),
    )
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'email-settings', overrideAccess: true }),
    )
  })

  it('writes a request confirmation by default', async () => {
    const message = await build(baseWalk()).email
    expect(message.subject).toBe('Your walk request with Milo is in!')
    expect(message.text).toContain('Thanks, Maya! Your walk request has been received.')
    expect(message.text).toContain('Awaiting shelter approval.')
    expect(message.html).toContain('What happens next?')
    expect(message.text).not.toContain('TEST PREVIEW')
  })

  it('writes an approval', async () => {
    const message = await build(baseWalk(), { kind: 'approved' }).email
    expect(message.subject).toBe('Your walk with Milo is confirmed!')
    expect(message.text).toContain('Great news, Maya! Your walk is confirmed.')
    expect(message.html).toContain('You are all set!')
  })

  it('writes a cancellation', async () => {
    const message = await build(baseWalk(), { kind: 'cancelled' }).email
    expect(message.subject).toBe('Your walk with Milo has been cancelled')
    expect(message.text).toContain('Hi, Maya. Your walk has been cancelled.')
    expect(message.text).toContain('Please do not arrive for this walk.')
    expect(message.html).toContain('CANCELLED WALK')
  })

  it('marks a preview with a banner and its own subject', async () => {
    const { asPayload } = fakePayload(baseWalk())
    const message = await buildBookingEmail(asPayload, 7, 'friend', true)
    expect(message.subject).toBe('Preview: your Good Walk confirmation')
    expect(message.text.startsWith('TEST PREVIEW ONLY - no booking was created.')).toBe(true)
    expect(message.html).toContain('TEST PREVIEW &mdash; no booking was created.')
  })

  it('formats the walk time in the saved time zone', async () => {
    const { asPayload } = fakePayload(baseWalk(), { timeZone: 'America/New_York' })
    const message = await buildBookingEmail(asPayload, 7, 'Maya Chen')
    expect(message.text).toMatch(/Time: 6:00\sAM \(America\/New_York\)/)
    expect(message.text).toContain('Date: Wednesday, July 1, 2026')
  })

  it('falls back to Europe/Warsaw when no time zone is saved', async () => {
    // A different process time zone, so the fallback cannot come from the system.
    vi.stubEnv('TZ', 'UTC')
    const { asPayload } = fakePayload(baseWalk(), { timeZone: null })
    const message = await buildBookingEmail(asPayload, 7, 'Maya Chen')
    expect(message.text).toMatch(/Time: 12:00\sPM \(Europe\/Warsaw\)/)
  })

  it('escapes the visitor name and walk details everywhere in the HTML', async () => {
    const walk = baseWalk()
    walk.dog = { name: 'Milo <b>bold</b>', breed: '"><img src=x onerror=alert(1)>', photo: null }
    walk.shelter = { name: 'Shelter & Co', address: "<a href='//evil'>here</a>" }
    const { asPayload } = fakePayload(walk)
    const message = await buildBookingEmail(asPayload, 7, '<script>alert(1)</script> Smith')

    expect(message.html).not.toContain('<script>')
    expect(message.html).not.toContain('<b>bold</b>')
    expect(message.html).not.toContain('<img src=x')
    expect(message.html).not.toContain("<a href='//evil'>")
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(message.html).toContain('Milo &lt;b&gt;bold&lt;/b&gt;')
    expect(message.html).toContain('Shelter &amp; Co')
  })

  it('never reads a photo whose file name leaves the media folder', async () => {
    const walk = baseWalk()
    walk.dog!.photo = { filename: '../package.json' }
    const { payload, asPayload } = fakePayload(walk)
    const message = await buildBookingEmail(asPayload, 7, 'Maya Chen')

    expect(sharpInputs().some((input) => typeof input === 'string')).toBe(false)
    expect(payload.logger.warn).not.toHaveBeenCalled()
    expect(message.attachments.map((item) => item.content_id)).toEqual(['brand-paw'])
  })

  it('still builds the message when the photo file is missing', async () => {
    const walk = baseWalk()
    walk.dog!.photo = { filename: `missing-${randomUUID()}.jpg` }
    const { payload, asPayload } = fakePayload(walk)
    const message = await buildBookingEmail(asPayload, 7, 'Maya Chen')

    expect(payload.logger.warn).toHaveBeenCalledWith(
      'Email dog photo unavailable; sending confirmation without photo.',
    )
    expect(message.attachments.map((item) => item.content_id)).toEqual(['brand-paw'])
    expect(message.attachments[0].filename).toBe('the-good-walk.png')
    expect(message.html).not.toContain('cid:walk-dog')
    expect(message.subject).toBe('Your walk request with Milo is in!')
  })

  it('uses defaults when the walk has no dog or shelter', async () => {
    const walk = baseWalk()
    walk.dog = null
    walk.shelter = null
    const { asPayload } = fakePayload(walk)
    const message = await buildBookingEmail(asPayload, 7, '  ')
    expect(message.subject).toBe('Your walk request with Your walking companion is in!')
    expect(message.text).toContain('Thanks, friend!')
    expect(message.text).toContain('Shelter: Your shelter')
  })
})
