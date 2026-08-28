import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type MyScheduleParams = QueryParams<'/me/schedule', 'get'>
export type AdminScheduleParams = QueryParams<'/admin/schedule', 'get'>

export function myScheduleQuery(params: MyScheduleParams) {
  return queryOptions({
    queryKey: ['my-schedule', params],
    queryFn: () => unwrap(api.GET('/me/schedule', { params: { query: params } })),
  })
}

export function adminScheduleQuery(params: AdminScheduleParams) {
  return queryOptions({
    queryKey: ['admin-schedule', params],
    queryFn: () => unwrap(api.GET('/admin/schedule', { params: { query: params } })),
  })
}
