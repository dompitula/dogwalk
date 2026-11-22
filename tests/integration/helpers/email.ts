import { vi } from 'vitest'
import { respondTo } from './network'
import { getTestPayload } from './payload'

export type ResendRequest = {
  authorization: string | null
  body: {
    from: string
    to: string[]
    reply_to?: string[]
    subject: string
    text?: string
    html?: string
    attachments?: { filename: string; content_id: string; content: string }[]
  }
}

/** Turns booking emails on, as staff would in Dashboard > Email settings, with an API key. */
export async function enableEmail({
  from = 'The Good Walk <walks@example.org>',
  replyTo = 'shelter@example.org',
  timeZone = 'Europe/Warsaw',
}: { from?: string; replyTo?: string | null; timeZone?: string } = {}) {
  vi.stubEnv('RESEND_API_KEY', 're_test_key')
  const payload = await getTestPayload()
  await payload.updateGlobal({
    slug: 'email-settings',
    overrideAccess: true,
    data: { enabled: true, from, replyTo, timeZone },
  })
}

/** Undoes `enableEmail`. */
export async function resetEmail() {
  vi.unstubAllEnvs()
  const payload = await getTestPayload()
  await payload.updateGlobal({
    slug: 'email-settings',
    overrideAccess: true,
    data: { enabled: false, from: null, replyTo: null, timeZone: 'Europe/Warsaw' },
  })
}

/**
 * Answers requests to the Resend API with `status` until the test ends, and returns the
 * requests it receives (filled in as they arrive).
 */
export function mockResend(status = 200) {
  const received: ResendRequest[] = []
  respondTo('api.resend.com', async (request) => {
    received.push({
      authorization: request.headers.get('authorization'),
      body: (await request.json()) as ResendRequest['body'],
    })
    const body = status < 300 ? { id: `email-${received.length}` } : { message: 'Server error' }
    return Response.json(body, { status })
  })
  return received
}
