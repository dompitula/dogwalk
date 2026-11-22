import { describe, expect, it } from 'vitest'
import { toID } from '@/lib/ids'

describe('toID', () => {
  it.each([
    [0, 0],
    [5, 5],
  ])('keeps the number %s', (value, expected) => {
    expect(toID(value)).toBe(expected)
  })

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects the number %s', (value) => {
    expect(toID(value)).toBeNull()
  })

  it.each([
    ['12', 12],
    [' 12 ', 12],
  ])('reads the string %j', (value, expected) => {
    expect(toID(value)).toBe(expected)
  })

  it.each(['', 'abc', '-1', '1e3', '1.5'])('rejects the string %j', (value) => {
    expect(toID(value)).toBeNull()
  })

  it.each([
    [{ id: 3 }, 3],
    [{ id: '4' }, 4],
    [{ id: { id: 5 } }, 5],
  ])('reads the id of %j', (value, expected) => {
    expect(toID(value)).toBe(expected)
  })

  it.each([null, undefined, {}])('rejects %j', (value) => {
    expect(toID(value)).toBeNull()
  })
})
