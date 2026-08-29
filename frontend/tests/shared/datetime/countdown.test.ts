import { describe, expect, it } from 'vitest'
import { countdownTickMs, countdownTo } from '@/shared/datetime/countdown'

const NOW = new Date('2026-09-01T12:00:00Z')

function at(iso: string) {
  return countdownTo(iso, NOW)
}

describe('countdown granularity', () => {
  it('coarsens to days when the deadline is far away', () => {
    const value = at('2026-09-05T12:00:00Z')
    expect(value?.granularity).toBe('days')
    expect(value?.days).toBe(4)
  })

  it('switches to hours inside a day', () => {
    const value = at('2026-09-01T20:30:00Z')
    expect(value?.granularity).toBe('hours')
    expect(value?.hours).toBe(8)
    expect(value?.minutes).toBe(30)
  })

  it('switches to minutes inside an hour', () => {
    const value = at('2026-09-01T12:45:00Z')
    expect(value?.granularity).toBe('minutes')
    expect(value?.minutes).toBe(45)
  })

  it('switches to seconds inside a minute', () => {
    const value = at('2026-09-01T12:00:30Z')
    expect(value?.granularity).toBe('seconds')
    expect(value?.seconds).toBe(30)
  })

  it('reports a passed deadline rather than counting backwards', () => {
    const value = at('2026-09-01T11:00:00Z')
    expect(value?.granularity).toBe('past')
    expect(value?.totalMs).toBeLessThan(0)
  })

  it('treats the exact deadline moment as passed', () => {
    expect(at('2026-09-01T12:00:00Z')?.granularity).toBe('past')
  })

  it('returns nothing for a missing or unparsable instant', () => {
    expect(at('not a date')).toBeNull()
    expect(countdownTo(null, NOW)).toBeNull()
    expect(countdownTo(undefined, NOW)).toBeNull()
  })

  it('ticks faster the finer the granularity', () => {
    expect(countdownTickMs('seconds')).toBeLessThanOrEqual(countdownTickMs('hours'))
    expect(countdownTickMs('minutes')).toBeLessThanOrEqual(countdownTickMs('days'))
  })
})
