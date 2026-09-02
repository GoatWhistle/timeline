import { afterEach, describe, expect, it } from 'vitest'
import {
  civilFromIso,
  civilToIso,
  compareCivil,
  compareCivilDates,
  isCivil,
  isCivilDate,
  isCivilTime,
  zoneOffsetLabel,
} from '@/shared/datetime/civil'
import { setTimeZone } from '@/shared/datetime/datetime'

afterEach(() => setTimeZone(undefined))

describe('civil date and time shapes', () => {
  it('accepts a well-formed date and rejects an impossible one', () => {
    expect(isCivilDate('2026-02-28')).toBe(true)
    expect(isCivilDate('2026-02-30')).toBe(false)
    expect(isCivilDate('2026-13-01')).toBe(false)
    expect(isCivilDate('2026-1-1')).toBe(false)
    expect(isCivilDate('')).toBe(false)
  })

  it('accepts a leap day only in a leap year', () => {
    expect(isCivilDate('2028-02-29')).toBe(true)
    expect(isCivilDate('2026-02-29')).toBe(false)
  })

  it('accepts a well-formed time and rejects an out-of-range one', () => {
    expect(isCivilTime('00:00')).toBe(true)
    expect(isCivilTime('23:59')).toBe(true)
    expect(isCivilTime('24:00')).toBe(false)
    expect(isCivilTime('12:60')).toBe(false)
    expect(isCivilTime('9:30')).toBe(false)
  })

  it('requires both halves for a complete moment', () => {
    expect(isCivil({ date: '2026-05-01', time: '10:00' })).toBe(true)
    expect(isCivil({ date: '2026-05-01', time: '' })).toBe(false)
    expect(isCivil({ date: '', time: '10:00' })).toBe(false)
  })
})

describe('the entered time survives the round trip', () => {
  it('keeps 10:00 as 10:00 in the profile zone, not the browser zone', () => {
    setTimeZone('Europe/Moscow')
    const iso = civilToIso({ date: '2026-05-01', time: '10:00' })
    expect(iso).toBe('2026-05-01T07:00:00.000Z')
    expect(civilFromIso(iso)).toEqual({ date: '2026-05-01', time: '10:00' })
  })

  it('reads the same instant differently in two zones', () => {
    setTimeZone('Europe/Moscow')
    expect(civilFromIso('2026-05-01T07:00:00Z')).toEqual({ date: '2026-05-01', time: '10:00' })
    setTimeZone('Asia/Vladivostok')
    expect(civilFromIso('2026-05-01T07:00:00Z')).toEqual({ date: '2026-05-01', time: '17:00' })
  })

  it('crosses midnight into the previous day where the offset demands it', () => {
    setTimeZone('Asia/Vladivostok')
    const iso = civilToIso({ date: '2026-05-01', time: '01:00' })
    expect(iso).toBe('2026-04-30T15:00:00.000Z')
    expect(civilFromIso(iso)).toEqual({ date: '2026-05-01', time: '01:00' })
  })

  it('round-trips every whole hour of a day without drifting', () => {
    setTimeZone('Europe/Moscow')
    for (let hour = 0; hour < 24; hour += 1) {
      const time = `${String(hour).padStart(2, '0')}:30`
      const iso = civilToIso({ date: '2026-07-14', time })
      expect(civilFromIso(iso)).toEqual({ date: '2026-07-14', time })
    }
  })

  it('honours a zone with a half-hour offset', () => {
    setTimeZone('Asia/Kolkata')
    expect(civilToIso({ date: '2026-05-01', time: '10:00' })).toBe('2026-05-01T04:30:00.000Z')
  })

  it('refuses to build an instant from an incomplete moment', () => {
    expect(civilToIso({ date: '2026-05-01', time: '' })).toBeNull()
    expect(civilToIso({ date: '', time: '10:00' })).toBeNull()
    expect(civilToIso({ date: '2026-02-30', time: '10:00' })).toBeNull()
  })

  it('returns an empty moment for a missing or unparsable instant', () => {
    expect(civilFromIso(null)).toEqual({ date: '', time: '' })
    expect(civilFromIso(undefined)).toEqual({ date: '', time: '' })
    expect(civilFromIso('not a date')).toEqual({ date: '', time: '' })
  })
})

describe('ordering moments', () => {
  it('orders dates chronologically, not as strings', () => {
    expect(compareCivilDates('2026-01-09', '2026-01-10')).toBeLessThan(0)
    expect(compareCivilDates('2026-01-10', '2026-01-09')).toBeGreaterThan(0)
    expect(compareCivilDates('2026-01-10', '2026-01-10')).toBe(0)
  })

  it('breaks a same-day tie by the time', () => {
    const early = { date: '2026-01-10', time: '09:00' }
    const late = { date: '2026-01-10', time: '18:00' }
    expect(compareCivil(early, late)).toBeLessThan(0)
    expect(compareCivil(late, early)).toBeGreaterThan(0)
    expect(compareCivil(early, early)).toBe(0)
  })
})

describe('the zone is stated, never assumed', () => {
  it('labels the offset of the profile zone', () => {
    setTimeZone('Europe/Moscow')
    expect(zoneOffsetLabel({ date: '2026-05-01', time: '10:00' })).toBe('GMT+3')
  })

  it('follows daylight saving where the zone observes it', () => {
    setTimeZone('Europe/Berlin')
    expect(zoneOffsetLabel({ date: '2026-01-15', time: '10:00' })).toBe('GMT+1')
    expect(zoneOffsetLabel({ date: '2026-07-15', time: '10:00' })).toBe('GMT+2')
  })
})
