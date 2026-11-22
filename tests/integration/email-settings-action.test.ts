import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveEmailSettings, sendTestEmail } from '@/app/(dashboard)/dashboard/email/actions'
import { enableEmail, mockResend, resetEmail } from './helpers/email'
import { createSlot, createStaff } from './helpers/fixtures'
import { getTestPayload } from './helpers/payload'
import { clearData } from './helpers/reset'
import { signInAs } from './helpers/session'

// Dashboard > Email settings: the save and test-email server actions.

let payload: Payload
let staffEmail: string
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(async () => {
  await clearData()
  const staff = await createStaff()
  staffEmail = staff.email
  await signInAs(staff)
})
afterEach(async () => {
  await resetEmail()
})

const initial = { ok: false, message: '' }

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const save = (fields: Record<string, string>) =>
  saveEmailSettings(initial, form({ timeZone: 'Europe/Warsaw', replyTo: '', ...fields }))

const savedSettings = () => payload.findGlobal({ slug: 'email-settings', overrideAccess: true })

const INVALID_SENDER = { ok: false, message: 'Enter a valid sender address.' }

describe('saveEmailSettings', () => {
  it('saves a sender with a display name', async () => {
    expect(
      await save({ from: 'Riverside Walks <walks@example.org>', replyTo: 'team@example.org' }),
    ).toEqual({ ok: true, message: 'Email settings saved. They apply immediately.' })
    expect(await savedSettings()).toMatchObject({
      enabled: false,
      from: 'Riverside Walks <walks@example.org>',
      replyTo: 'team@example.org',
      timeZone: 'Europe/Warsaw',
    })
  })

  it.each([
    ['a plain address', 'walks@example.org\r\nBcc: everyone@example.com'],
    ['a display name', 'Walks\r\nBcc: everyone@example.com <walks@example.org>'],
  ])('rejects a line break in %s (header injection)', async (_case, from) => {
    expect(await save({ from })).toEqual(INVALID_SENDER)
    expect((await savedSettings()).from).toBeFalsy()
  })

  it.each(['walks', 'Walks <not an address>', 'walks@example'])(
    'rejects the sender %j',
    async (from) => {
      expect(await save({ from })).toEqual(INVALID_SENDER)
    },
  )

  it('rejects an invalid reply-to address', async () => {
    expect(await save({ from: 'walks@example.org', replyTo: 'team at example.org' })).toEqual({
      ok: false,
      message: 'Enter a valid reply-to email address.',
    })
  })

  it('rejects an invalid time zone', async () => {
    expect(await save({ from: 'walks@example.org', timeZone: 'Mars/Olympus_Mons' })).toEqual({
      ok: false,
      message: 'Enter a valid time zone, such as Europe/Warsaw.',
    })
  })

  it('refuses to switch email on without RESEND_API_KEY', async () => {
    expect(await save({ from: 'walks@example.org', enabled: 'on' })).toEqual({
      ok: false,
      message: 'Set RESEND_API_KEY in .env and restart the app before enabling emails.',
    })
    expect((await savedSettings()).enabled).toBe(false)
  })

  it('switches email on with RESEND_API_KEY', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    expect((await save({ from: 'walks@example.org', enabled: 'on' })).ok).toBe(true)
    expect((await savedSettings()).enabled).toBe(true)
  })

  it('asks a signed-out user to sign in and saves nothing', async () => {
    await signInAs(null)
    expect(await save({ from: 'walks@example.org' })).toEqual({
      ok: false,
      message: 'Please sign in again.',
    })
    expect((await savedSettings()).from).toBeFalsy()
  })
})

describe('sendTestEmail', () => {
  it('sends a preview to the signed-in staff member', async () => {
    await enableEmail()
    const sent = mockResend()
    await createSlot()

    expect(await sendTestEmail(initial, form({}))).toEqual({
      ok: true,
      message: 'Test email accepted for sending. Check your inbox and spam folder.',
    })
    expect(sent).toHaveLength(1)
    expect(sent[0].body).toMatchObject({
      to: [staffEmail],
      subject: 'Preview: your Good Walk confirmation',
    })
  })

  it('asks for email settings first when email is off', async () => {
    await createSlot()
    expect(await sendTestEmail(initial, form({}))).toEqual({
      ok: false,
      message: 'Save and enable your email settings first.',
    })
  })

  it('asks a signed-out user to sign in', async () => {
    await signInAs(null)
    expect(await sendTestEmail(initial, form({}))).toEqual({
      ok: false,
      message: 'Please sign in again.',
    })
  })
})
