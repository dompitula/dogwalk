import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { Media } from '@/collections/Media'
import { MEDIA_DIR } from '@/lib/media-dir'
import { createDog } from './helpers/fixtures'
import { requests } from './helpers/network'
import { getTestPayload } from './helpers/payload'

// The test harness itself: every integration test file runs on its own throwaway database
// and media folder, with no network and none of the developer's settings.

const testsFolder = path.resolve('.tmp-tests')
const realMedia = path.resolve('media')
const listing = (folder: string) => (existsSync(folder) ? readdirSync(folder).toSorted() : [])

let payload: Payload
beforeAll(async () => {
  payload = await getTestPayload()
})

describe('integration test harness', () => {
  it('uses a database and media folder inside .tmp-tests', () => {
    expect(process.env.DATABASE_URL).toMatch(/^file:\.\/\.tmp-tests\/[0-9a-f-]{36}\/test\.db$/)
    expect(MEDIA_DIR.startsWith(testsFolder + path.sep)).toBe(true)
    expect(Media.upload && typeof Media.upload === 'object' && Media.upload.staticDir).toBe(
      MEDIA_DIR,
    )
  })

  it('does not use the settings in .env', () => {
    expect(process.env.PAYLOAD_SECRET).toBe('integration-tests-only')
    expect(process.env.SAMPLE_DATA).toBe('false')
    expect(process.env.RESEND_API_KEY).toBeUndefined()
  })

  it('runs in the Europe/Warsaw time zone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Warsaw')
  })

  it('starts with an empty database (no sample data)', async () => {
    const [admins, dogs, walks] = await Promise.all([
      payload.count({ collection: 'admins', overrideAccess: true }),
      payload.count({ collection: 'dogs', overrideAccess: true }),
      payload.count({ collection: 'walk-slots', overrideAccess: true }),
    ])
    expect([admins.totalDocs, dogs.totalDocs, walks.totalDocs]).toEqual([0, 0, 0])
  })

  it('writes uploaded photos into MEDIA_DIR, not ./media', async () => {
    const before = listing(realMedia)
    const dog = await createDog()
    const photo = await payload.findByID({
      collection: 'media',
      id: typeof dog.photo === 'object' ? dog.photo.id : dog.photo,
      overrideAccess: true,
    })

    expect(photo.filename).toBeTruthy()
    expect(existsSync(path.join(MEDIA_DIR, photo.filename!))).toBe(true)
    expect(listing(realMedia)).toEqual(before)
  })

  it('makes no network requests while starting Payload', () => {
    // Telemetry and the sample photo download would show up here.
    expect(requests()).toEqual([])
  })

  it('blocks network requests and reports them', async () => {
    await expect(fetch('https://example.com/')).rejects.toThrow('Network request blocked')
    // Forget it, so the guard in setup.ts does not fail this test.
    const { takeUnexpectedRequests } = await import('./helpers/network')
    expect(takeUnexpectedRequests()).toEqual([
      { method: 'GET', url: 'https://example.com/', handled: false },
    ])
  })
})
