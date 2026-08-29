import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'

export const deviceSessionsQueryKey = ['me', 'sessions'] as const

export function deviceSessionsQuery() {
  return queryOptions({
    queryKey: deviceSessionsQueryKey,
    queryFn: () => unwrap(api.GET('/me/sessions')),
    staleTime: 0,
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/me/sessions/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceSessionsQueryKey }),
  })
}
