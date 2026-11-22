import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

// MEDIA_DIR is read when the module is imported, so each test imports it afresh.
const load = async () => (await import('@/lib/media-dir')).MEDIA_DIR

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('MEDIA_DIR', () => {
  it('is the media folder of the project by default', async () => {
    vi.stubEnv('MEDIA_DIR', undefined)
    expect(await load()).toBe(path.resolve(process.cwd(), 'media'))
  })

  it('resolves a relative MEDIA_DIR against the project folder', async () => {
    vi.stubEnv('MEDIA_DIR', '.tmp-tests/run/media')
    expect(await load()).toBe(path.resolve(process.cwd(), '.tmp-tests', 'run', 'media'))
  })

  it('keeps an absolute MEDIA_DIR', async () => {
    const absolute = path.resolve('/srv/good-walk/uploads')
    vi.stubEnv('MEDIA_DIR', absolute)
    expect(await load()).toBe(absolute)
  })
})
