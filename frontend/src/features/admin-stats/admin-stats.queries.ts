import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { EventState, RegistrationCoverage } from '@/shared/api/types.gen'

export const STATS_STALE_MS = 5 * 60 * 1000

export const COUNTED_STATES: EventState[] = ['UNPUBLISHED', 'UPCOMING', 'ACTIVE', 'FINISHED']

async function totalFor(state: EventState): Promise<number> {
  const page = await unwrap(
    api.GET('/admin/events', { params: { query: { state, page: 1, page_size: 1 } } }),
  )
  return page.meta?.total ?? 0
}

export function eventStateCountsQuery() {
  return queryOptions({
    queryKey: ['admin-stats', 'event-states'],
    staleTime: STATS_STALE_MS,
    gcTime: STATS_STALE_MS,
    queryFn: async () => {
      const totals = await Promise.all(COUNTED_STATES.map((state) => totalFor(state)))
      return Object.fromEntries(
        COUNTED_STATES.map((state, index) => [state, totals[index] ?? 0]),
      ) as Record<EventState, number>
    },
  })
}

export function registrationCoverageQuery() {
  return queryOptions({
    queryKey: ['admin-stats', 'registration-coverage'],
    staleTime: STATS_STALE_MS,
    gcTime: STATS_STALE_MS,
    queryFn: async (): Promise<RegistrationCoverage> =>
      unwrap(api.GET('/admin/queries/registration-coverage', {})),
  })
}
