import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleDataEnabled } from '@/seed/index'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sampleDataEnabled', () => {
  it.each(['false', '0', 'no', 'off', 'FALSE', 'Off', ' no ', '\tfalse\n'])(
    'is off for SAMPLE_DATA=%j',
    (value) => {
      vi.stubEnv('SAMPLE_DATA', value)
      expect(sampleDataEnabled()).toBe(false)
    },
  )

  it.each(['', 'true', '1', 'yes'])('is on for SAMPLE_DATA=%j', (value) => {
    vi.stubEnv('SAMPLE_DATA', value)
    expect(sampleDataEnabled()).toBe(true)
  })

  it('is on when SAMPLE_DATA is not set', () => {
    vi.stubEnv('SAMPLE_DATA', undefined)
    expect(process.env.SAMPLE_DATA).toBeUndefined()
    expect(sampleDataEnabled()).toBe(true)
  })
})
