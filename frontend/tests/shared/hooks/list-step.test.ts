import { describe, expect, it } from 'vitest'
import { step } from '@/shared/hooks/use-list-navigation/use-list-navigation'

const IDS = ['a', 'b', 'c']

describe('step', () => {
  it('returns nothing when the list is empty, whatever the direction', () => {
    expect(step([], null, 1)).toBeNull()
    expect(step([], null, -1)).toBeNull()
    expect(step([], 'a', 1)).toBeNull()
  })

  it('enters the list at the first row when moving down with no selection', () => {
    expect(step(IDS, null, 1)).toBe('a')
  })

  it('enters the list at the last row when moving up with no selection', () => {
    expect(step(IDS, null, -1)).toBe('c')
  })

  it('moves one row at a time in both directions', () => {
    expect(step(IDS, 'a', 1)).toBe('b')
    expect(step(IDS, 'b', 1)).toBe('c')
    expect(step(IDS, 'c', -1)).toBe('b')
    expect(step(IDS, 'b', -1)).toBe('a')
  })

  it('stops at the edges rather than wrapping around', () => {
    expect(step(IDS, 'c', 1)).toBe('c')
    expect(step(IDS, 'a', -1)).toBe('a')
  })

  it('recovers to the first row when the selection is no longer in the list', () => {
    expect(step(IDS, 'removed', 1)).toBe('a')
    expect(step(IDS, 'removed', -1)).toBe('a')
  })

  it('holds still on a single-row list', () => {
    expect(step(['only'], 'only', 1)).toBe('only')
    expect(step(['only'], 'only', -1)).toBe('only')
    expect(step(['only'], null, 1)).toBe('only')
    expect(step(['only'], null, -1)).toBe('only')
  })

  it('honours a jump wider than one row and still clamps at the edge', () => {
    expect(step(IDS, 'a', 2)).toBe('c')
    expect(step(IDS, 'a', 3)).toBe('a')
    expect(step(IDS, 'c', -2)).toBe('a')
    expect(step(IDS, 'c', -3)).toBe('c')
  })
})
