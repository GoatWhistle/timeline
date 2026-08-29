import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { SystemEventPage, UnreadCountResponse } from '@/shared/api/types.gen'

export const eventFeedQueryKey = ['events-feed'] as const
export const unreadCountQueryKey = ['events-feed', 'unread-count'] as const

export const unreadCountQueryOptions = queryOptions<UnreadCountResponse>({
  queryKey: unreadCountQueryKey,
  queryFn: () => unwrap(api.GET('/me/events-feed/unread-count')),
  staleTime: 30_000,
})

export function eventFeedQueryOptions(unread: boolean) {
  return queryOptions<SystemEventPage>({
    queryKey: [...eventFeedQueryKey, { unread }],
    queryFn: () =>
      unwrap(api.GET('/me/events-feed', { params: { query: { unread, page_size: 50 } } })),
    staleTime: 30_000,
  })
}

export function useMarkFeedRead() {
  const queryClient = useQueryClient()
  return useMutation<UnreadCountResponse, Error, string[]>({
    mutationFn: (ids) => unwrap(api.POST('/me/events-feed/read', { body: { ids } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventFeedQueryKey })
    },
  })
}
