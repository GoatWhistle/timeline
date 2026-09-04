import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'
import { personalKeys } from './personal.keys'

export type HistoryParams = QueryParams<'/me/history', 'get'>

export function historyQuery(params: HistoryParams) {
  return queryOptions({
    queryKey: personalKeys.history(params),
    queryFn: () => unwrap(api.GET('/me/history', { params: { query: params } })),
  })
}
