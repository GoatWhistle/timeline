import { beforeEach, describe, expect, it } from 'vitest'
import { clearRecent, pushRecent, readRecent } from '@/features/command-palette/recent-store'

beforeEach(() => {
  localStorage.clear()
})

describe('recent-store', () => {
  it('starts empty', () => {
    expect(readRecent()).toEqual([])
  })

  it('remembers a pushed entry', () => {
    pushRecent({ id: 'ev_1', title: 'Timeline Hack', path: '/events/ev_1' })
    expect(readRecent()).toEqual([{ id: 'ev_1', title: 'Timeline Hack', path: '/events/ev_1' }])
  })

  it('puts the most recent entry first', () => {
    pushRecent({ id: 'ev_1', title: 'First', path: '/events/ev_1' })
    pushRecent({ id: 'ev_2', title: 'Second', path: '/events/ev_2' })
    expect(readRecent().map((entry) => entry.id)).toEqual(['ev_2', 'ev_1'])
  })

  it('moves a repeated entry to the front instead of duplicating it', () => {
    pushRecent({ id: 'ev_1', title: 'First', path: '/events/ev_1' })
    pushRecent({ id: 'ev_2', title: 'Second', path: '/events/ev_2' })
    pushRecent({ id: 'ev_1', title: 'First', path: '/events/ev_1' })
    const recent = readRecent()
    expect(recent).toHaveLength(2)
    expect(recent[0]?.id).toBe('ev_1')
  })

  it('keeps at most five entries', () => {
    for (let index = 0; index < 8; index += 1) {
      pushRecent({ id: `ev_${index}`, title: `Event ${index}`, path: `/events/ev_${index}` })
    }
    expect(readRecent()).toHaveLength(5)
    expect(readRecent()[0]?.id).toBe('ev_7')
  })

  it('clears everything', () => {
    pushRecent({ id: 'ev_1', title: 'First', path: '/events/ev_1' })
    clearRecent()
    expect(readRecent()).toEqual([])
  })

  it('ignores malformed JSON already in storage', () => {
    localStorage.setItem('timeline-palette-recent', '{not json')
    expect(readRecent()).toEqual([])
  })

  it('ignores a stored value that is not an array of entries', () => {
    localStorage.setItem('timeline-palette-recent', JSON.stringify({ id: 'ev_1' }))
    expect(readRecent()).toEqual([])
  })
})
