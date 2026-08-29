import { afterEach, describe, expect, it } from 'vitest'
import {
  currentTimeZone,
  formatDateTime,
  formatInZone,
  isTimeZone,
  SYSTEM_TIME_ZONE,
  setTimeZone,
  zoneAbbreviation,
  zonesAgree,
} from '@/shared/datetime/datetime'

const NOON_UTC = '2026-09-01T12:00:00Z'

afterEach(() => {
  setTimeZone(SYSTEM_TIME_ZONE)
})

describe('personal time zone', () => {
  it('renders the same instant differently in different zones', () => {
    setTimeZone('Asia/Tokyo')
    const tokyo = formatDateTime(NOON_UTC, 'en')

    setTimeZone('Europe/Moscow')
    const moscow = formatDateTime(NOON_UTC, 'en')

    expect(tokyo).not.toBe(moscow)
    expect(tokyo).toContain('21:00')
    expect(moscow).toContain('15:00')
  })

  it('falls back to the system zone for an unknown identifier', () => {
    setTimeZone('Mars/Olympus')
    expect(currentTimeZone()).toBe(SYSTEM_TIME_ZONE)

    setTimeZone(undefined)
    expect(currentTimeZone()).toBe(SYSTEM_TIME_ZONE)

    setTimeZone('')
    expect(currentTimeZone()).toBe(SYSTEM_TIME_ZONE)
  })

  it('recognises valid IANA identifiers and rejects offsets', () => {
    expect(isTimeZone('Europe/Moscow')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone(null)).toBe(false)
    expect(isTimeZone(undefined)).toBe(false)
  })

  it('reports whether the personal and system zones agree', () => {
    setTimeZone(SYSTEM_TIME_ZONE)
    expect(zonesAgree(NOON_UTC)).toBe(true)

    setTimeZone('Asia/Tokyo')
    expect(zonesAgree(NOON_UTC)).toBe(false)
  })

  it('labels the zone alongside the time', () => {
    setTimeZone('Asia/Tokyo')
    expect(zoneAbbreviation(NOON_UTC)).toBe('GMT+9')

    setTimeZone('Europe/Moscow')
    expect(zoneAbbreviation(NOON_UTC)).toBe('GMT+3')
  })

  it('formats an instant in an explicitly named zone regardless of the active one', () => {
    setTimeZone('Asia/Tokyo')
    expect(formatInZone(NOON_UTC, SYSTEM_TIME_ZONE, 'en')).toContain('15:00')
    expect(formatDateTime(NOON_UTC, 'en')).toContain('21:00')
  })

  it('returns a dash rather than throwing on a missing instant', () => {
    setTimeZone('Asia/Tokyo')
    expect(formatDateTime(null, 'en')).toBe('—')
    expect(formatInZone(undefined, SYSTEM_TIME_ZONE, 'en')).toBe('—')
    expect(zoneAbbreviation(null)).toBe('')
    expect(zonesAgree(null)).toBe(true)
  })
})
