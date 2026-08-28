import { describe, expect, it } from 'vitest'
import {
  centerOf,
  clampToBounds,
  easeZoom,
  interpolateRange,
  MIN_SPAN_MS,
  padRange,
  type Range,
  rangeAround,
  scaleForSpan,
  scaleSpanMs,
  spanOf,
} from '@/features/schedule/model/zoom-range'

const DAY = 86_400_000

function range(fromDays: number, toDays: number): Range {
  return { from: fromDays * DAY, to: toDays * DAY }
}

describe('spanOf', () => {
  it('measures the range', () => {
    expect(spanOf(range(0, 10))).toBe(10 * DAY)
  })

  it('never falls below one day', () => {
    expect(spanOf({ from: 0, to: 0 })).toBe(MIN_SPAN_MS)
    expect(spanOf({ from: 10, to: 0 })).toBe(MIN_SPAN_MS)
  })
})

describe('rangeAround', () => {
  it('centres the span on the given moment', () => {
    const result = rangeAround(100 * DAY, 10 * DAY)
    expect(centerOf(result)).toBe(100 * DAY)
    expect(spanOf(result)).toBe(10 * DAY)
  })

  it('clamps a degenerate span', () => {
    expect(spanOf(rangeAround(0, 0))).toBe(MIN_SPAN_MS)
  })
})

describe('interpolateRange', () => {
  it('returns the start at progress zero and the end at progress one', () => {
    const from = range(0, 10)
    const to = range(100, 200)
    expect(interpolateRange(from, to, 0)).toEqual(from)
    expect(interpolateRange(from, to, 1)).toEqual(to)
  })

  it('interpolates the span logarithmically, not linearly', () => {
    const from = range(0, 10)
    const to = range(0, 1000)
    const middle = interpolateRange(from, to, 0.5)
    const geometric = Math.sqrt(spanOf(from) * spanOf(to))
    expect(spanOf(middle)).toBeCloseTo(geometric, -3)
    expect(spanOf(middle)).toBeLessThan((spanOf(from) + spanOf(to)) / 2)
  })

  it('makes equal steps feel equal at any scale', () => {
    const from = range(0, 10)
    const to = range(0, 1000)
    const quarter = spanOf(interpolateRange(from, to, 0.25))
    const half = spanOf(interpolateRange(from, to, 0.5))
    const threeQuarters = spanOf(interpolateRange(from, to, 0.75))
    expect(half / quarter).toBeCloseTo(threeQuarters / half, 5)
  })

  it('moves the centre linearly', () => {
    const from = range(0, 10)
    const to = range(100, 110)
    expect(centerOf(interpolateRange(from, to, 0.5))).toBeCloseTo(
      (centerOf(from) + centerOf(to)) / 2,
      5,
    )
  })

  it('clamps progress outside zero to one', () => {
    const from = range(0, 10)
    const to = range(100, 200)
    expect(interpolateRange(from, to, -5)).toEqual(from)
    expect(interpolateRange(from, to, 5)).toEqual(to)
  })
})

describe('clampToBounds', () => {
  it('leaves a range that already fits', () => {
    const value = range(10, 20)
    expect(clampToBounds(value, range(0, 100))).toEqual(value)
  })

  it('pushes a range that runs off the left edge', () => {
    const result = clampToBounds(range(-50, -40), range(0, 100))
    expect(result.from).toBe(0)
    expect(spanOf(result)).toBe(10 * DAY)
  })

  it('pushes a range that runs off the right edge', () => {
    const result = clampToBounds(range(140, 150), range(0, 100))
    expect(result.to).toBe(100 * DAY)
    expect(spanOf(result)).toBe(10 * DAY)
  })

  it('anchors a range wider than the bounds at the left edge', () => {
    const result = clampToBounds(range(-100, 300), range(0, 100))
    expect(result.from).toBe(0)
    expect(spanOf(result)).toBe(400 * DAY)
  })
})

describe('padRange', () => {
  it('adds empty time on both sides', () => {
    const result = padRange(range(0, 100), 0.1)
    expect(result.from).toBe(-10 * DAY)
    expect(result.to).toBe(110 * DAY)
  })
})

describe('scaleSpanMs and scaleForSpan', () => {
  it('orders the three zoom levels', () => {
    expect(scaleSpanMs('week')).toBeLessThan(scaleSpanMs('month'))
    expect(scaleSpanMs('month')).toBeLessThan(scaleSpanMs('quarter'))
  })

  it('recovers the scale from its own span', () => {
    for (const scale of ['week', 'month', 'quarter'] as const) {
      expect(scaleForSpan(scaleSpanMs(scale))).toBe(scale)
    }
  })
})

describe('easeZoom', () => {
  it('runs from zero to one and clamps outside', () => {
    expect(easeZoom(0)).toBe(0)
    expect(easeZoom(1)).toBe(1)
    expect(easeZoom(-1)).toBe(0)
    expect(easeZoom(2)).toBe(1)
  })

  it('decelerates', () => {
    expect(easeZoom(0.5)).toBeGreaterThan(0.5)
  })
})
