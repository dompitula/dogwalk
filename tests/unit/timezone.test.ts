import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('runs in the Europe/Warsaw time zone (vitest.config.ts)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Warsaw')
  })
})
