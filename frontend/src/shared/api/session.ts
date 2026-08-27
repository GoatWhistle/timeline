import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from './client'
import { isApiError } from './errors'
import type { MeResponse } from './types.gen'

export const sessionQueryKey = ['session'] as const

export const sessionQueryOptions = queryOptions<MeResponse>({
  queryKey: sessionQueryKey,
  queryFn: () => unwrap(api.GET('/me')),
  retry: false,
  staleTime: 60_000,
})

export type SessionState = {
  user: MeResponse | undefined
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

export function useSession(): SessionState {
  const { data, isPending, error } = useQuery(sessionQueryOptions)
  const unauthenticated = isApiError(error) && error.status === 401
  return {
    user: data,
    isLoading: isPending && !unauthenticated,
    isAuthenticated: Boolean(data),
    isAdmin: Boolean(data?.is_admin),
  }
}
