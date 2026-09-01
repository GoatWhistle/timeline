import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { UpdateSessionRequest } from '@/shared/api/types.gen'

export const deviceSessionsQueryKey = ['me', 'sessions'] as const

export function deviceSessionsQuery() {
  return queryOptions({
    queryKey: deviceSessionsQueryKey,
    queryFn: () => unwrap(api.GET('/me/sessions')),
    staleTime: 0,
  })
}

export function useRenameSession() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, { id: string; body: UpdateSessionRequest }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/me/sessions/{id}', { params: { path: { id } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceSessionsQueryKey }),
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/me/sessions/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceSessionsQueryKey }),
  })
}
