import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { PublicProfileResponse } from '@/shared/api/types.gen'

export function publicProfileQueryOptions(nickname: string) {
  return queryOptions<PublicProfileResponse>({
    queryKey: ['public-profile', nickname] as const,
    queryFn: () => unwrap(api.GET('/profiles/{nickname}', { params: { path: { nickname } } })),
    enabled: nickname !== '',
    retry: false,
  })
}

export function usePublicProfile(nickname: string) {
  return useQuery(publicProfileQueryOptions(nickname))
}
