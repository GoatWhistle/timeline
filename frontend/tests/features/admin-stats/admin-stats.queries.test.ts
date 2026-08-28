import { describe, expect, it } from 'vitest'
import {
  COUNTED_STATES,
  eventStateCountsQuery,
  overdueCountQuery,
  STATS_STALE_MS,
  upcomingCountQuery,
} from '@/features/admin-stats/admin-stats.queries'

describe('admin statistics caching', () => {
  it('holds aggregates for five minutes', () => {
    expect(STATS_STALE_MS).toBe(5 * 60 * 1000)
  })

  it('applies the cache window to every aggregate query', () => {
    for (const options of [eventStateCountsQuery(), overdueCountQuery(), upcomingCountQuery()]) {
      expect(options.staleTime).toBe(STATS_STALE_MS)
    }
  })

  it('keys the upcoming aggregate by its window so a different window is not served stale', () => {
    expect(upcomingCountQuery(72).queryKey).not.toEqual(upcomingCountQuery(24).queryKey)
  })

  it('counts the four live states and leaves archived out', () => {
    expect(COUNTED_STATES).toEqual(['UNPUBLISHED', 'UPCOMING', 'ACTIVE', 'FINISHED'])
    expect(COUNTED_STATES).not.toContain('ARCHIVED')
  })
})
