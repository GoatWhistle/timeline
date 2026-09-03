import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_LANES,
  LANE_SEPARATION_DAYS,
  packTimeline,
  type SpanInput,
} from '@/features/schedule/model/pack-lanes'

function span(id: string, startDay: number, endDay: number): SpanInput {
  return { id, startDay, endDay }
}

function lanesOf(result: ReturnType<typeof packTimeline<SpanInput>>) {
  return result.packed.map((entry) => [entry.item.id, entry.lane])
}

describe('packTimeline', () => {
  it('returns nothing for no items', () => {
    const result = packTimeline([], 30)
    expect(result.packed).toHaveLength(0)
    expect(result.laneCount).toBe(0)
    expect(result.hidden).toHaveLength(0)
  })

  it('puts a lone span on lane zero', () => {
    const result = packTimeline([span('a', 0, 3)], 30)
    expect(result.packed[0]?.lane).toBe(0)
    expect(result.laneCount).toBe(1)
  })

  it('draws a span crossing many weeks as a single bar', () => {
    const result = packTimeline([span('a', 0, 40)], 60)
    expect(result.packed).toHaveLength(1)
    expect(result.packed[0]).toMatchObject({ startDay: 0, endDay: 40, span: 41 })
  })

  it('pushes an overlapping span to the next lane', () => {
    const result = packTimeline([span('a', 0, 3), span('b', 2, 5)], 30)
    expect(result.laneCount).toBe(2)
    expect(lanesOf(result)).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })

  it('treats spans touching on a single day as overlapping', () => {
    const result = packTimeline([span('a', 0, 2), span('b', 2, 4)], 30)
    expect(result.laneCount).toBe(2)
  })

  it('keeps a clear day between neighbours rather than letting bars abut', () => {
    const result = packTimeline([span('a', 0, 2), span('b', 3, 5)], 30)
    expect(result.laneCount).toBe(2)
  })

  it('reuses a lane once the gap is wide enough to separate the bars', () => {
    const result = packTimeline([span('a', 0, 2), span('b', 2 + LANE_SEPARATION_DAYS + 1, 9)], 30)
    expect(result.laneCount).toBe(1)
    expect(lanesOf(result)).toEqual([
      ['a', 0],
      ['b', 0],
    ])
  })

  it('clips a span starting before the grid and marks the start', () => {
    const result = packTimeline([span('a', -3, 2)], 30)
    expect(result.packed[0]).toMatchObject({ startDay: 0, clippedStart: true })
  })

  it('clips a span running past the grid and marks the end', () => {
    const result = packTimeline([span('a', 25, 60)], 30)
    expect(result.packed[0]).toMatchObject({ endDay: 29, clippedEnd: true })
  })

  it('drops a span lying entirely outside the grid', () => {
    expect(packTimeline([span('a', 40, 50)], 30).packed).toHaveLength(0)
    expect(packTimeline([span('a', -20, -5)], 30).packed).toHaveLength(0)
  })

  it('hides the spans that exceed the lane budget instead of stacking them', () => {
    const items = Array.from({ length: 5 }, (_, index) => span(`i${index}`, 0, 4))
    const result = packTimeline(items, 30, 2)

    expect(result.packed).toHaveLength(2)
    expect(result.hidden).toHaveLength(3)
    expect(result.laneCount).toBe(2)
  })

  it('defaults to a lane budget rather than growing without limit', () => {
    const items = Array.from({ length: DEFAULT_MAX_LANES + 4 }, (_, index) =>
      span(`i${index}`, 0, 4),
    )
    const result = packTimeline(items, 30)

    expect(result.packed).toHaveLength(DEFAULT_MAX_LANES)
    expect(result.hidden).toHaveLength(4)
  })

  it('orders lanes by the day a span starts so earlier events sit higher', () => {
    const result = packTimeline([span('late', 10, 14), span('early', 0, 4)], 30)
    const early = result.packed.find((entry) => entry.item.id === 'early')
    expect(early?.lane).toBe(0)
  })
})
