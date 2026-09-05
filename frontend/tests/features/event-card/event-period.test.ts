import { describe, expect, it } from 'vitest'
import { resolvePeriod } from '@/features/event-card/event-period'

const START = '2026-09-01T00:00:00Z'
const END = '2026-10-01T00:00:00Z'

describe('where the reader stands inside an event period', () => {
  it('counts the days to a start that has not arrived', () => {
    const period = resolvePeriod(START, END, new Date('2026-08-25T00:00:00Z'))

    expect(period.phase).toBe('before')
    expect(period.days).toBe(7)
    expect(period.progress).toBe(0)
  })

  it('counts the days left while the event runs', () => {
    const period = resolvePeriod(START, END, new Date('2026-09-21T00:00:00Z'))

    expect(period.phase).toBe('during')
    expect(period.days).toBe(10)
  })

  it('places the reader inside the span, not merely inside the phase', () => {
    const half = resolvePeriod(START, END, new Date('2026-09-16T00:00:00Z'))
    const late = resolvePeriod(START, END, new Date('2026-09-25T00:00:00Z'))

    expect(half.progress).toBeCloseTo(0.5, 2)
    expect(late.progress).toBeGreaterThan(half.progress)
  })

  it('counts the days since an event that has ended, and fills the span', () => {
    const period = resolvePeriod(START, END, new Date('2026-10-04T00:00:00Z'))

    expect(period.phase).toBe('after')
    expect(period.days).toBe(3)
    expect(period.progress).toBe(1)
  })

  it('never reports progress outside the span it measures', () => {
    for (const at of ['2026-08-01T00:00:00Z', '2026-09-15T00:00:00Z', '2026-12-01T00:00:00Z']) {
      const period = resolvePeriod(START, END, new Date(at))
      expect(period.progress).toBeGreaterThanOrEqual(0)
      expect(period.progress).toBeLessThanOrEqual(1)
    }
  })

  it('says so plainly when the dates cannot be read, rather than inventing a phase', () => {
    expect(resolvePeriod(null, END).phase).toBe('unknown')
    expect(resolvePeriod(START, 'not a date').phase).toBe('unknown')
    expect(resolvePeriod(END, START).phase).toBe('unknown')
  })

  it('treats a single-instant event as complete rather than dividing by zero', () => {
    const period = resolvePeriod(START, START, new Date(START))

    expect(period.phase).toBe('during')
    expect(Number.isFinite(period.progress)).toBe(true)
    expect(period.progress).toBe(1)
  })
})
