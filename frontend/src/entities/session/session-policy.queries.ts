import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { SessionPolicyResponse } from '@/shared/api/types.gen'

export type SessionPolicyDraft = { idle_days: number | null }

const sessionPolicyQueryKey = ['session-policy'] as const

export function sessionPolicyQuery() {
  return queryOptions({
    queryKey: sessionPolicyQueryKey,
    queryFn: () => unwrap(api.GET('/me/session-policy')),
  })
}

export function useSessionPolicy() {
  return useQuery(sessionPolicyQuery())
}

export function useSaveSessionPolicy() {
  const queryClient = useQueryClient()
  return useMutation<SessionPolicyResponse, Error, SessionPolicyDraft>({
    mutationFn: (body) =>
      unwrap(api.PUT('/me/session-policy', { body: body as { idle_days?: number } })),
    onSuccess: (data) => queryClient.setQueryData(sessionPolicyQueryKey, data),
  })
}
