import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Returns the Payload instance and the signed-in staff account (or `null`).
 * Staff sign in with the same accounts as the Payload content manager at /admin;
 * the session cookie is shared, so signing in on either page signs in on both.
 * Server-side only (server components and server actions).
 */
export async function getStaffSession() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const staff = user && user.collection === 'admins' ? user : null
  return { payload, user: staff }
}
