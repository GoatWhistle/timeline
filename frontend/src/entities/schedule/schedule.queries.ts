import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type MyScheduleParams = QueryParams<'/me/schedule', 'get'>

export function myScheduleQuery(params: MyScheduleParams) {
  return queryOptions({
    queryKey: ['my-schedule', params],
    queryFn: () => unwrap(api.GET('/me/schedule', { params: { query: params } })),
  })
}
