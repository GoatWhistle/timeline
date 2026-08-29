import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'

export function eventLinksQuery(eventId: string) {
  return queryOptions({
    queryKey: ['links', eventId],
    queryFn: () => unwrap(api.GET('/events/{id}/links', { params: { path: { id: eventId } } })),
  })
}
