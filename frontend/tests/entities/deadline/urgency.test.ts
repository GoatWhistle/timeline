import { describe, expect, it } from 'vitest'
import {
  resolveUrgency,
  URGENCY_KEY,
  URGENCY_ORDER,
  URGENCY_TEXT,
} from '@/entities/deadline/urgency/urgency'

const NOW = new Date('2026-03-10T12:00:00Z')

function at(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString()
}

const HOUR = 3_600_000
const DAY = 86_400_000

describe('resolveUrgency', () => {
  it('reports overdue when the deadline has passed and the mark is missing', () => {
    expect(resolveUrgency({ deadlineAt: at(-HOUR), status: 'TODO', now: NOW })).toBe('overdue')
  })

  it('reports today under twenty four hours', () => {
    expect(resolveUrgency({ deadlineAt: at(HOUR * 5), status: 'TODO', now: NOW })).toBe('today')
    expect(resolveUrgency({ deadlineAt: at(DAY - 1), status: 'TODO', now: NOW })).toBe('today')
  })

  it('reports soon between one and seven days', () => {
    expect(resolveUrgency({ deadlineAt: at(DAY + 1), status: 'TODO', now: NOW })).toBe('soon')
    expect(resolveUrgency({ deadlineAt: at(DAY * 7), status: 'TODO', now: NOW })).toBe('soon')
  })

  it('reports calm beyond seven days', () => {
    expect(resolveUrgency({ deadlineAt: at(DAY * 7 + 1), status: 'TODO', now: NOW })).toBe('calm')
  })

  it('separates a self reported mark from an administrative waiver', () => {
    const done = resolveUrgency({ deadlineAt: at(-DAY), status: 'DONE', now: NOW })
    const waived = resolveUrgency({ deadlineAt: at(-DAY), status: 'NOT_REQUIRED', now: NOW })
    expect(done).toBe('done')
    expect(waived).toBe('waived')
    expect(done).not.toBe(waived)
  })

  it('keeps a waiver out of the overdue bucket even past the deadline', () => {
    expect(resolveUrgency({ deadlineAt: at(-DAY * 30), status: 'NOT_REQUIRED', now: NOW })).toBe(
      'waived',
    )
  })

  it('falls back to calm without a deadline or with an unparsable one', () => {
    expect(resolveUrgency({ deadlineAt: null, status: 'TODO', now: NOW })).toBe('calm')
    expect(resolveUrgency({ deadlineAt: 'not a date', status: 'TODO', now: NOW })).toBe('calm')
  })
})

describe('urgency presentation tables', () => {
  it('covers every level with a class and a dictionary key', () => {
    for (const level of URGENCY_ORDER) {
      expect(URGENCY_TEXT[level]).toBeTruthy()
      expect(URGENCY_KEY[level]).toBe(`event:urgency.${level}`)
    }
  })

  it('gives weight, not only colour, to the two most pressing levels', () => {
    expect(URGENCY_TEXT.overdue).toContain('font-semibold')
    expect(URGENCY_TEXT.today).toContain('font-semibold')
  })

  it('paints a waiver with its own neutral token rather than the done green', () => {
    expect(URGENCY_TEXT.waived).toContain('urgency-waived')
    expect(URGENCY_TEXT.waived).not.toContain('urgency-done')
  })
})
