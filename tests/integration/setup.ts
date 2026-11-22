import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { afterEach, vi } from 'vitest'
import { guardedFetch, takeUnexpectedRequests } from './helpers/network'

/**
 * Runs before each integration test file is imported (vitest.config.ts `setupFiles`). It
 * only sets the environment and installs mocks; it never starts Payload. The environment
 * has to be set here because payload.config.ts reads it when it is imported.
 */

// Each test file runs in its own process (pool: 'forks'), so a second run in one process
// would mean two files share a Payload instance and its database.
const runState = globalThis as typeof globalThis & { __goodWalkTestRun?: string }
if (runState.__goodWalkTestRun) {
  throw new Error('Two integration test files ran in one process; each needs its own database.')
}

// Each test file gets its own database and media folder. A relative file: URL, as the app
// uses; an absolute one (file:C:\...) is unreliable with libsql on Windows.
const runDir = path.join('.tmp-tests', randomUUID())
runState.__goodWalkTestRun = runDir
mkdirSync(path.join(runDir, 'media'), { recursive: true })
process.env.DATABASE_URL = `file:./${runDir.split(path.sep).join('/')}/test.db`
process.env.MEDIA_DIR = path.resolve(runDir, 'media')
process.env.PAYLOAD_SECRET = 'integration-tests-only'
process.env.SAMPLE_DATA = 'false'
delete process.env.RESEND_API_KEY

// Server actions read the staff session from the request headers (src/lib/staff-auth.ts).
vi.mock('next/headers', async () => {
  const session = await import('./helpers/session')
  return {
    headers: async () => session.currentHeaders(),
    cookies: async () => session.currentCookies(),
  }
})

// No test reaches the network: see helpers/network.ts.
vi.stubGlobal('fetch', guardedFetch)

afterEach(() => {
  vi.unstubAllEnvs()
  const unexpected = takeUnexpectedRequests()
  if (unexpected.length) {
    const list = unexpected.map((request) => `${request.method} ${request.url}`).join(', ')
    throw new Error(`Unexpected network requests: ${list}`)
  }
})
