import { describe, expect, it } from 'vitest'
import {
  clampIndex,
  type NavigableSpan,
  nearestSpanByDay,
  resolveKey,
} from '@/features/schedule/model/grid-navigation'

const SPANS: NavigableSpan[] = [
  { id: 'a', startDay: 0, lane: 0 },
  { id: 'b', startDay: 3, lane: 1 },
  { id: 'c', startDay: 9, lane: 0 },
  { id: 'd', startDay: 20, lane: 2 },
]

describe('clampIndex', () => {
  it('keeps an index inside the list', () => {
    expect(clampIndex(SPANS, 2)).toBe(2)
  })

  it('clamps past the end', () => {
    expect(clampIndex(SPANS, 99)).toBe(SPANS.length - 1)
  })

  it('clamps a negative index to zero', () => {
    expect(clampIndex(SPANS, -4)).toBe(0)
  })

  it('survives an empty list', () => {
    expect(clampIndex([], 5)).toBe(0)
  })
})

describe('nearestSpanByDay', () => {
  it('finds the span starting closest to the day', () => {
    expect(nearestSpanByDay(SPANS, 8)).toBe(2)
  })

  it('prefers the earlier span on a tie', () => {
    expect(
      nearestSpanByDay(
        [
          { id: 'x', startDay: 0, lane: 0 },
          { id: 'y', startDay: 4, lane: 0 },
        ],
        2,
      ),
    ).toBe(0)
  })

  it('returns zero for an empty list', () => {
    expect(nearestSpanByDay([], 5)).toBe(0)
  })
})

describe('resolveKey', () => {
  it('steps forward and back through the events', () => {
    expect(resolveKey('ArrowRight', SPANS, 0)).toEqual({ type: 'move', index: 1 })
    expect(resolveKey('ArrowLeft', SPANS, 2)).toEqual({ type: 'move', index: 1 })
  })

  it('stops at both ends instead of wrapping', () => {
    expect(resolveKey('ArrowLeft', SPANS, 0)).toEqual({ type: 'move', index: 0 })
    expect(resolveKey('ArrowRight', SPANS, 3)).toEqual({ type: 'move', index: 3 })
  })

  it('moves to the nearest event one lane down and back up', () => {
    expect(resolveKey('ArrowDown', SPANS, 0)).toEqual({ type: 'move', index: 1 })
    expect(resolveKey('ArrowUp', SPANS, 1)).toEqual({ type: 'move', index: 0 })
  })

  it('holds still when no lane lies further down', () => {
    expect(resolveKey('ArrowDown', SPANS, 3)).toEqual({ type: 'move', index: 3 })
  })

  it('holds still when no lane lies further up', () => {
    expect(resolveKey('ArrowUp', SPANS, 0)).toEqual({ type: 'move', index: 0 })
  })

  it('scrolls the viewport by a page on PageUp and PageDown', () => {
    expect(resolveKey('PageDown', SPANS, 0)).toEqual({ type: 'scroll', delta: 1, page: true })
    expect(resolveKey('PageUp', SPANS, 0)).toEqual({ type: 'scroll', delta: -1, page: true })
  })

  it('steps between the moments of an event on n and p', () => {
    expect(resolveKey('n', SPANS, 0)).toEqual({ type: 'moment', delta: 1 })
    expect(resolveKey('p', SPANS, 0)).toEqual({ type: 'moment', delta: -1 })
  })

  it('goes to the first and last event on Home and End', () => {
    expect(resolveKey('Home', SPANS, 2)).toEqual({ type: 'move', index: 0 })
    expect(resolveKey('End', SPANS, 0)).toEqual({ type: 'move', index: 3 })
  })

  it('opens on Enter', () => {
    expect(resolveKey('Enter', SPANS, 1)).toEqual({ type: 'open' })
  })

  it('jumps to today on either case of t', () => {
    expect(resolveKey('t', SPANS, 0)).toEqual({ type: 'today' })
    expect(resolveKey('T', SPANS, 0)).toEqual({ type: 'today' })
  })

  it('zooms in and out on the plus and minus keys', () => {
    expect(resolveKey('+', SPANS, 0)).toEqual({ type: 'zoomIn' })
    expect(resolveKey('=', SPANS, 0)).toEqual({ type: 'zoomIn' })
    expect(resolveKey('-', SPANS, 0)).toEqual({ type: 'zoomOut' })
    expect(resolveKey('_', SPANS, 0)).toEqual({ type: 'zoomOut' })
  })

  it('ignores an unrelated key', () => {
    expect(resolveKey('q', SPANS, 0)).toBeUndefined()
  })

  it('clamps a cursor that has fallen out of range', () => {
    expect(resolveKey('ArrowRight', SPANS, 99)).toEqual({ type: 'move', index: 3 })
  })

  it('survives an empty list', () => {
    expect(resolveKey('ArrowDown', [], 0)).toEqual({ type: 'move', index: 0 })
  })
})
