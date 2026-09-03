import { describe, expect, it } from 'vitest'
import {
  LANE_SEPARATION_DAYS,
  packTimeline,
  type SpanInput,
} from '@/features/schedule/model/pack-lanes'

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomSpans(random: () => number, count: number, dayCount: number): SpanInput[] {
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(random() * dayCount)
    const length = Math.floor(random() * 12)
    return {
      id: `i${index}`,
      startDay: start,
      endDay: Math.min(dayCount - 1, start + length),
    }
  })
}

describe('packTimeline over generated inputs', () => {
  it('never puts two bars on one lane over the same day, over generated inputs', () => {
    const random = mulberry32(20260829)

    for (let round = 0; round < 400; round += 1) {
      const dayCount = 7 + Math.floor(random() * 60)
      const items = randomSpans(random, 1 + Math.floor(random() * 12), dayCount)
      const { packed } = packTimeline(items, dayCount, 99)

      const taken = new Map<string, string>()
      for (const entry of packed) {
        for (let day = entry.startDay; day <= entry.endDay; day += 1) {
          const cell = `${entry.lane}:${day}`
          expect(taken.has(cell)).toBe(false)
          taken.set(cell, entry.item.id)
        }
      }
    }
  })

  it('leaves a clear day between neighbours sharing a lane, over generated inputs', () => {
    const random = mulberry32(4242)

    for (let round = 0; round < 400; round += 1) {
      const dayCount = 7 + Math.floor(random() * 60)
      const items = randomSpans(random, 1 + Math.floor(random() * 12), dayCount)
      const { packed } = packTimeline(items, dayCount, 99)

      const byLane = new Map<number, typeof packed>()
      for (const entry of packed) {
        byLane.set(entry.lane, [...(byLane.get(entry.lane) ?? []), entry])
      }

      for (const lane of byLane.values()) {
        const ordered = [...lane].sort((a, b) => a.startDay - b.startDay)
        for (let index = 1; index < ordered.length; index += 1) {
          const previous = ordered[index - 1]
          const current = ordered[index]
          if (!previous || !current) continue
          expect(current.startDay - previous.endDay).toBeGreaterThan(LANE_SEPARATION_DAYS - 1)
        }
      }
    }
  })

  it('gives every item exactly one bar, over generated inputs', () => {
    const random = mulberry32(909)

    for (let round = 0; round < 200; round += 1) {
      const dayCount = 7 + Math.floor(random() * 40)
      const items = randomSpans(random, 1 + Math.floor(random() * 8), dayCount)
      const { packed, hidden } = packTimeline(items, dayCount, 99)

      const counts = new Map<string, number>()
      for (const entry of packed) {
        counts.set(entry.item.id, (counts.get(entry.item.id) ?? 0) + 1)
      }

      for (const count of counts.values()) expect(count).toBe(1)
      expect(packed.length + hidden.length).toBe(items.length)
    }
  })
})
