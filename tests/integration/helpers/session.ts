import { getTestPayload } from './payload'

/** The request headers `next/headers` returns in tests (see setup.ts). */
let current = new Headers()

export const currentHeaders = () => current

/** No cookies: the session is sent as an `Authorization: JWT` header instead. */
export const currentCookies = () => ({
  get: (_name: string) => undefined,
  getAll: () => [],
  has: (_name: string) => false,
})

/** Signs in as a staff account for the server actions that follow, or signs out (`null`). */
export async function signInAs(staff: { email: string; password: string } | null) {
  if (!staff) {
    current = new Headers()
    return
  }
  const payload = await getTestPayload()
  const { token } = await payload.login({
    collection: 'admins',
    data: { email: staff.email, password: staff.password },
  })
  if (!token) throw new Error(`Could not sign in as ${staff.email}`)
  current = new Headers({ Authorization: `JWT ${token}` })
}
