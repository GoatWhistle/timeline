import { describe, expect, it } from 'vitest'
import {
  DAYS_PER_WEEK,
  DEFAULT_MAX_LANES,
  packWeeks,
  type SpanInput,
  splitByWeek,
} from '@/features/schedule/model/pack-lanes'

function span(id: string, startDay: number, endDay: number): SpanInput {
  return { id, startDay, endDay }
}

function lanesOf(result: ReturnType<typeof packWeeks<SpanInput>>) {
  return result.weeks.flatMap((week) => week.segments.map((s) => [s.item.id, s.week, s.lane]))
}

describe('splitByWeek', () => {
  it('keeps a span inside one week as a single segment', () => {
    const segments = splitByWeek(span('a', 1, 4), 3)
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ week: 0, startColumn: 1, span: 4 })
  })

  it('breaks a span crossing a week boundary into one segment per week', () => {
    const segments = splitByWeek(span('a', 5, 9), 3)
    expect(segments.map((s) => [s.week, s.startColumn, s.span])).toEqual([
      [0, 5, 2],
      [1, 0, 3],
    ])
  })

  it('covers every week a long span passes through', () => {
    const segments = splitByWeek(span('a', 0, 20), 3)
    expect(segments.map((s) => s.week)).toEqual([0, 1, 2])
    expect(segments.reduce((total, s) => total + s.span, 0)).toBe(21)
  })

  it('marks the continuation edges as clipped and the real ends as not', () => {
    const segments = splitByWeek(span('a', 5, 9), 3)
    expect(segments[0]).toMatchObject({ clippedStart: false, clippedEnd: true })
    expect(segments[1]).toMatchObject({ clippedStart: true, clippedEnd: false })
  })

  it('leaves a single-week span unclipped on both edges', () => {
    const [segment] = splitByWeek(span('a', 2, 3), 2)
    expect(segment).toMatchObject({ clippedStart: false, clippedEnd: false })
  })

  it('clips a span starting before the grid and marks the start', () => {
    const segments = splitByWeek(span('a', -3, 2), 2)
    expect(segments[0]).toMatchObject({ startDay: 0, startColumn: 0, clippedStart: true })
  })

  it('clips a span running past the grid and marks the end', () => {
    const segments = splitByWeek(span('a', 10, 40), 2)
    const last = segments[segments.length - 1]
    expect(last?.endDay).toBe(2 * DAYS_PER_WEEK - 1)
    expect(last?.clippedEnd).toBe(true)
  })

  it('drops a span lying entirely outside the grid', () => {
    expect(splitByWeek(span('a', 40, 50), 2)).toEqual([])
    expect(splitByWeek(span('a', -20, -5), 2)).toEqual([])
  })

  it('gives every segment a span of at least one day', () => {
    for (const segment of splitByWeek(span('a', 0, 20), 3)) {
      expect(segment.span).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('packWeeks', () => {
  it('returns one empty packing per week for no items', () => {
    const result = packWeeks([], 3)
    expect(result.weeks).toHaveLength(3)
    expect(result.laneCount).toBe(0)
    expect(result.weeks.every((week) => week.segments.length === 0)).toBe(true)
  })

  it('puts a lone span on lane zero', () => {
    const result = packWeeks([span('a', 0, 3)], 1)
    expect(result.weeks[0]?.segments[0]?.lane).toBe(0)
    expect(result.laneCount).toBe(1)
  })

  it('keeps spans that do not share a day on the same lane', () => {
    const result = packWeeks([span('a', 0, 1), span('b', 3, 4)], 1)
    expect(result.laneCount).toBe(1)
    expect(result.weeks[0]?.segments.map((s) => s.lane)).toEqual([0, 0])
  })

  it('pushes an overlapping span to the next lane', () => {
    const result = packWeeks([span('a', 0, 3), span('b', 2, 5)], 1)
    expect(result.laneCount).toBe(2)
    expect(lanesOf(result)).toEqual([
      ['a', 0, 0],
      ['b', 0, 1],
    ])
  })

  it('treats spans touching on a single day as overlapping', () => {
    const result = packWeeks([span('a', 0, 2), span('b', 2, 4)], 1)
    expect(result.laneCount).toBe(2)
  })

  it('holds one lane across every week a span crosses', () => {
    const result = packWeeks([span('blocker', 0, 2), span('long', 1, 16)], 3)
    const laneByWeek = new Map(
      result.weeks.flatMap((week) =>
        week.segments.filter((s) => s.item.id === 'long').map((s) => [s.week, s.lane]),
      ),
    )
    expect([...laneByWeek.values()]).toEqual([1, 1, 1])
  })

  it('reuses a freed lane in a later week', () => {
    const result = packWeeks([span('a', 0, 2), span('b', 1, 3), span('c', 8, 10)], 2)
    const c = result.weeks[1]?.segments.find((s) => s.item.id === 'c')
    expect(c?.lane).toBe(0)
  })

  it('keeps a crossing span on one lane instead of dropping it into a lane freed later', () => {
    const result = packWeeks(
      [
        span('crosser', 5, 18),
        span('head', 4, 10),
        span('third', 6, 9),
        span('tailA', 14, 19),
        span('tailB', 14, 19),
        span('last', 20, 20),
      ],
      3,
      9,
    )

    const crosser = result.weeks.flatMap((week) =>
      week.segments.filter((s) => s.item.id === 'crosser').map((s) => [s.week, s.lane]),
    )
    expect(crosser).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
    ])

    const week2 = new Map(result.weeks[2]?.segments.map((s) => [s.item.id, s.lane]))
    expect(week2.get('tailA')).toBe(0)
    expect(week2.get('tailB')).toBe(2)
  })

  it('hides segments past the lane budget and counts them per week', () => {
    const items = Array.from({ length: 5 }, (_, index) => span(`i${index}`, 0, 3))
    const result = packWeeks(items, 1, DEFAULT_MAX_LANES)
    expect(result.weeks[0]?.segments).toHaveLength(DEFAULT_MAX_LANES)
    expect(result.weeks[0]?.hidden).toBe(5 - DEFAULT_MAX_LANES)
  })

  it('counts a hidden span once per week it would have covered', () => {
    const items = [
      ...Array.from({ length: 3 }, (_, index) => span(`b${index}`, 0, 13)),
      span('over', 0, 13),
    ]
    const result = packWeeks(items, 2, 3)
    expect(result.weeks.map((week) => week.hidden)).toEqual([1, 1])
  })

  it('reports no hidden segments when everything fits', () => {
    const result = packWeeks([span('a', 0, 2), span('b', 3, 5)], 1, DEFAULT_MAX_LANES)
    expect(result.weeks[0]?.hidden).toBe(0)
  })

  it('respects a custom lane budget', () => {
    const items = Array.from({ length: 4 }, (_, index) => span(`i${index}`, 0, 3))
    const result = packWeeks(items, 1, 1)
    expect(result.weeks[0]?.segments).toHaveLength(1)
    expect(result.weeks[0]?.hidden).toBe(3)
  })

  it('orders by start day, then by longest span, then by id', () => {
    const result = packWeeks([span('z', 0, 1), span('a', 0, 5), span('m', 0, 1)], 1, 9)
    expect(result.weeks[0]?.segments.map((s) => s.item.id)).toEqual(['a', 'm', 'z'])
  })

  it('does not mutate the input array', () => {
    const items = [span('c', 4, 5), span('a', 0, 1)]
    const order = items.map((item) => item.id)
    packWeeks(items, 1)
    expect(items.map((item) => item.id)).toEqual(order)
  })

  it('drops a span lying outside the grid entirely', () => {
    const result = packWeeks([span('gone', 100, 110), span('here', 0, 2)], 2)
    expect(lanesOf(result)).toEqual([['here', 0, 0]])
  })
})
