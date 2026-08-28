import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import { teamProgress } from './model/team-progress'

const TEAM_PAGE_SIZE = 200
const TEAM_STALE_MS = 5 * 60 * 1000

export function teamProgressQuery(eventId: string, enabled: boolean) {
  return queryOptions({
    queryKey: ['team-progress', eventId],
    enabled,
    retry: false,
    staleTime: TEAM_STALE_MS,
    gcTime: TEAM_STALE_MS,
    queryFn: async () => {
      const page = await unwrap(
        api.GET('/admin/events/{id}/registration-statuses', {
          params: { path: { id: eventId }, query: { page: 1, page_size: TEAM_PAGE_SIZE } },
        }),
      )
      return teamProgress(page.items ?? [])
    },
  })
}
