import { describe, expect, it } from 'vitest'
import { DAYS_PER_WEEK, packWeeks, type SpanInput } from '@/features/schedule/model/pack-lanes'

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

describe('packWeeks over generated inputs', () => {
  it('never puts two segments on one lane over the same day, over generated inputs', () => {
    const random = mulberry32(20260829)

    for (let round = 0; round < 400; round += 1) {
      const weekCount = 1 + Math.floor(random() * 4)
      const items = randomSpans(random, 1 + Math.floor(random() * 9), weekCount * DAYS_PER_WEEK)
      const result = packWeeks(items, weekCount, 99)

      for (const week of result.weeks) {
        const taken = new Map<string, string>()
        for (const segment of week.segments) {
          for (let offset = 0; offset < segment.span; offset += 1) {
            const cell = `${segment.lane}:${segment.startColumn + offset}`
            expect(taken.has(cell)).toBe(false)
            taken.set(cell, segment.item.id)
          }
        }
      }
    }
  })

  it('keeps one lane per item across all its weeks, over generated inputs', () => {
    const random = mulberry32(4242)

    for (let round = 0; round < 300; round += 1) {
      const weekCount = 2 + Math.floor(random() * 3)
      const items = randomSpans(random, 1 + Math.floor(random() * 8), weekCount * DAYS_PER_WEEK)
      const result = packWeeks(items, weekCount, 99)

      const lanes = new Map<string, Set<number>>()
      for (const week of result.weeks) {
        for (const segment of week.segments) {
          const seen = lanes.get(segment.item.id) ?? new Set<number>()
          seen.add(segment.lane)
          lanes.set(segment.item.id, seen)
        }
      }
      for (const seen of lanes.values()) expect(seen.size).toBe(1)
    }
  })

  it('keeps every segment inside its week, over generated inputs', () => {
    const random = mulberry32(31337)

    for (let round = 0; round < 300; round += 1) {
      const weekCount = 1 + Math.floor(random() * 4)
      const items = randomSpans(random, 1 + Math.floor(random() * 10), weekCount * DAYS_PER_WEEK)

      for (const week of packWeeks(items, weekCount, 99).weeks) {
        for (const segment of week.segments) {
          expect(segment.startColumn).toBeGreaterThanOrEqual(0)
          expect(segment.startColumn + segment.span).toBeLessThanOrEqual(DAYS_PER_WEEK)
        }
      }
    }
  })
})
