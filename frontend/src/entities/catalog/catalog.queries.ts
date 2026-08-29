import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'
import type { JoinEventRequest, ParticipantSelfResponse } from '@/shared/api/types.gen'

const catalogKeys = {
  list: (params: Record<string, unknown>) => ['catalog', params] as const,
}

export type CatalogParams = QueryParams<'/catalog', 'get'>

export function catalogQuery(params: CatalogParams) {
  return queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: () => unwrap(api.GET('/catalog', { params: { query: params } })),
  })
}

export function useJoinEvent(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ParticipantSelfResponse, Error, JoinEventRequest>({
    mutationFn: (body) =>
      unwrap(api.POST('/events/{id}/join', { params: { path: { id: eventId } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
    },
  })
}
