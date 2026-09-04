import { describe, expect, it } from 'vitest'
import { endOfDay, startOfDay } from '@/features/catalog/catalog.params'
import { setTimeZone } from '@/shared/datetime/datetime'

describe('catalog date filters follow the profile timezone', () => {
  it('shifts the boundary with the profile zone', () => {
    setTimeZone('Europe/Moscow')
    const moscow = startOfDay('2026-09-04')
    setTimeZone('UTC')
    const utc = startOfDay('2026-09-04')
    expect(moscow).not.toBe(utc)
    expect(moscow).toBe('2026-09-03T21:00:00.000Z')
    expect(utc).toBe('2026-09-04T00:00:00.000Z')
  })

  it('closes the day at its end, not its start', () => {
    setTimeZone('UTC')
    expect(endOfDay('2026-09-04')).toBe('2026-09-04T23:59:00.000Z')
  })
})
