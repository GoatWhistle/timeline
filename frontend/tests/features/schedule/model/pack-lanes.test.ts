import { describe, expect, it } from 'vitest'
import {
  LANE_GAP,
  type LaneInput,
  MIN_BAR_WIDTH,
  packLanes,
} from '@/features/schedule/model/pack-lanes'

function bar(id: string, left: number, width: number): LaneInput {
  return { id, left, width }
}

function span(item: LaneInput, minWidth: number = MIN_BAR_WIDTH) {
  return { left: item.left, right: item.left + Math.max(minWidth, item.width) }
}

function maxOverlapDepth(
  items: readonly LaneInput[],
  gap: number = LANE_GAP,
  minWidth: number = MIN_BAR_WIDTH,
) {
  const intervals = items.map((item) => {
    const { left, right } = span(item, minWidth)
    return { left, right: right + gap }
  })
  const edges = [...new Set(intervals.flatMap(({ left, right }) => [left, right]))]
  return edges.reduce((best, edge) => {
    const depth = intervals.filter(({ left, right }) => left <= edge && edge < right).length
    return Math.max(best, depth)
  }, 0)
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomBars(random: () => number, count: number): LaneInput[] {
  return Array.from({ length: count }, (_, index) =>
    bar(`i${index}`, Math.floor(random() * 300), Math.floor(random() * 80)),
  )
}

describe('packLanes', () => {
  it('returns an empty result for an empty input', () => {
    const result = packLanes([])
    expect(result.placements).toEqual([])
    expect(result.laneCount).toBe(0)
  })

  it('puts a single item on lane zero', () => {
    const result = packLanes([bar('a', 0, 100)])
    expect(result.laneCount).toBe(1)
    expect(result.placements).toEqual([{ item: bar('a', 0, 100), lane: 0 }])
  })

  it('lays disjoint items out on one lane', () => {
    const result = packLanes([bar('a', 0, 50), bar('b', 100, 50), bar('c', 200, 50)])
    expect(result.laneCount).toBe(1)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 0, 0])
  })

  it('spreads overlapping items across separate lanes', () => {
    const result = packLanes([bar('a', 0, 100), bar('b', 50, 100)])
    expect(result.laneCount).toBe(2)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 1])
  })

  it('reuses a lane once it is free again', () => {
    const result = packLanes([bar('a', 0, 100), bar('b', 50, 100), bar('c', 300, 50)])
    expect(result.laneCount).toBe(2)
    const lanes = new Map(result.placements.map((p) => [p.item.id, p.lane]))
    expect(lanes.get('a')).toBe(0)
    expect(lanes.get('b')).toBe(1)
    expect(lanes.get('c')).toBe(0)
  })

  it('reuses the lowest free lane rather than opening a new one', () => {
    const result = packLanes([bar('a', 0, 100), bar('b', 50, 100), bar('c', 120, 80)])
    expect(result.laneCount).toBe(2)
    const lanes = new Map(result.placements.map((p) => [p.item.id, p.lane]))
    expect(lanes.get('c')).toBe(0)
  })

  it('sorts input by left edge regardless of the given order', () => {
    const result = packLanes([bar('c', 200, 50), bar('a', 0, 50), bar('b', 100, 50)])
    expect(result.placements.map((p) => p.item.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by right edge when the left edges are equal', () => {
    const result = packLanes([bar('wide', 0, 200), bar('narrow', 0, 50)])
    expect(result.placements.map((p) => p.item.id)).toEqual(['narrow', 'wide'])
  })

  it('honours the gap between items on one lane', () => {
    const touching = packLanes([bar('a', 0, 100), bar('b', 100 + LANE_GAP, 50)])
    expect(touching.laneCount).toBe(1)

    const tooClose = packLanes([bar('a', 0, 100), bar('b', 100 + LANE_GAP - 1, 50)])
    expect(tooClose.laneCount).toBe(2)
  })

  it('widens a narrow item to the minimum bar width', () => {
    const result = packLanes([bar('a', 0, 0), bar('b', MIN_BAR_WIDTH - 1, 10)])
    expect(result.laneCount).toBe(2)
  })

  it('accepts custom gap and minimum width', () => {
    const result = packLanes([bar('a', 0, 10), bar('b', 20, 10)], 30, 1)
    expect(result.laneCount).toBe(2)
  })

  it('keeps a custom minimum width out of the packing decision when items are far apart', () => {
    const result = packLanes([bar('a', 0, 10), bar('b', 20, 10)], 0, 1)
    expect(result.laneCount).toBe(1)
  })

  it('grows the lane count with the overlap depth', () => {
    const result = packLanes([bar('a', 0, 300), bar('b', 10, 300), bar('c', 20, 300)])
    expect(result.laneCount).toBe(3)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 1, 2])
  })

  it('keeps the original item object in the placement', () => {
    const item = { id: 'a', left: 5, width: 7, extra: 'kept' }
    const result = packLanes([item])
    expect(result.placements[0]?.item).toBe(item)
  })

  it('places every input item exactly once', () => {
    const items = [bar('a', 0, 100), bar('b', 50, 100), bar('c', 120, 80), bar('d', 0, 400)]
    const result = packLanes(items)
    expect(result.placements).toHaveLength(items.length)
    expect(new Set(result.placements.map((p) => p.item.id))).toEqual(
      new Set(items.map((item) => item.id)),
    )
  })

  it('does not mutate the input array', () => {
    const items = [bar('c', 200, 50), bar('a', 0, 50), bar('b', 100, 50)]
    const order = items.map((item) => item.id)
    packLanes(items)
    expect(items.map((item) => item.id)).toEqual(order)
  })

  it('never overlaps two items sharing a lane, over generated inputs', () => {
    const random = mulberry32(20260828)

    for (let round = 0; round < 400; round += 1) {
      const items = randomBars(random, 1 + Math.floor(random() * 10))
      const { placements } = packLanes(items)

      const byLane = new Map<number, { left: number; right: number }[]>()
      for (const { item, lane } of placements) {
        const lanes = byLane.get(lane) ?? []
        lanes.push(span(item))
        byLane.set(lane, lanes)
      }

      for (const lanes of byLane.values()) {
        const sorted = [...lanes].sort((a, b) => a.left - b.left)
        for (let index = 1; index < sorted.length; index += 1) {
          const previous = sorted[index - 1]
          const current = sorted[index]
          if (!previous || !current) continue
          expect(current.left).toBeGreaterThanOrEqual(previous.right + LANE_GAP)
        }
      }
    }
  })

  it('uses exactly as many lanes as the deepest overlap, over generated inputs', () => {
    const random = mulberry32(777)

    for (let round = 0; round < 400; round += 1) {
      const items = randomBars(random, 1 + Math.floor(random() * 8))
      expect(packLanes(items).laneCount).toBe(maxOverlapDepth(items))
    }
  })

  it('assigns a contiguous lane range starting at zero, over generated inputs', () => {
    const random = mulberry32(31337)

    for (let round = 0; round < 200; round += 1) {
      const items = randomBars(random, 1 + Math.floor(random() * 12))
      const { placements, laneCount } = packLanes(items)
      const used = new Set(placements.map((p) => p.lane))
      expect(used.size).toBe(laneCount)
      expect(Math.min(...used)).toBe(0)
      expect(Math.max(...used)).toBe(laneCount - 1)
    }
  })
})
