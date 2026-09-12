import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { InboxItemResponse, InboxPage, UnreadCountResponse } from '@/shared/api/types.gen'

const inboxQueryKey = ['inbox'] as const
const unreadCountQueryKey = ['inbox', 'unread-count'] as const

export const inboxUnreadCountQueryOptions = queryOptions<UnreadCountResponse>({
  queryKey: unreadCountQueryKey,
  queryFn: () => unwrap(api.GET('/me/inbox/unread-count')),
  staleTime: 30_000,
})

export function inboxQueryOptions({
  unread,
  page = 1,
  pageSize = 50,
}: {
  unread?: boolean
  page?: number
  pageSize?: number
}) {
  return queryOptions<InboxPage>({
    queryKey: [...inboxQueryKey, { unread, page, pageSize }],
    queryFn: () =>
      unwrap(
        api.GET('/me/inbox', {
          params: { query: { unread, page, page_size: pageSize } },
        }),
      ),
    staleTime: 15_000,
  })
}

export function inboxPreviewQueryOptions() {
  return inboxQueryOptions({ pageSize: 5 })
}

function useInvalidateInbox() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: inboxQueryKey })
  }
}

export function useMarkInboxRead() {
  const invalidate = useInvalidateInbox()
  return useMutation<UnreadCountResponse, Error, string[]>({
    mutationFn: (ids) => unwrap(api.POST('/me/inbox/read', { body: { ids } })),
    onSuccess: invalidate,
  })
}

export function useDeleteInboxItem() {
  const invalidate = useInvalidateInbox()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/me/inbox/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useRestoreInboxItem() {
  const invalidate = useInvalidateInbox()
  return useMutation<InboxItemResponse, Error, string>({
    mutationFn: (id) => unwrap(api.POST('/me/inbox/{id}/restore', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useDeleteInbox() {
  const invalidate = useInvalidateInbox()
  return useMutation<unknown, Error, { readOnly?: boolean }>({
    mutationFn: ({ readOnly }) =>
      unwrap(api.DELETE('/me/inbox', { params: { query: { read_only: readOnly } } })),
    onSuccess: invalidate,
  })
}

export function useMarkInboxRegistered() {
  const invalidate = useInvalidateInbox()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.POST('/me/inbox/{id}/mark-registered', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useInboxPreview() {
  return useQuery(inboxPreviewQueryOptions())
}
