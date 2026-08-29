import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type QueueParams = QueryParams<'/ops/queue', 'get'>
export type QueueScope = 'failures' | 'stuck-leases'

const STALE_MS = 30_000

export function queueQuery(params: QueueParams) {
  return queryOptions({
    queryKey: ['ops', 'queue', params],
    queryFn: () => unwrap(api.GET('/ops/queue', { params: { query: params } })),
    staleTime: STALE_MS,
  })
}
