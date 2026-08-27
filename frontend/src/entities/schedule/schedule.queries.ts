import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type MyTimelineParams = QueryParams<'/me/timeline', 'get'>
export type AdminTimelineParams = QueryParams<'/admin/timeline', 'get'>

export function myTimelineQuery(params: MyTimelineParams) {
  return queryOptions({
    queryKey: ['my-timeline', params],
    queryFn: () => unwrap(api.GET('/me/timeline', { params: { query: params } })),
  })
}

export function adminTimelineQuery(params: AdminTimelineParams) {
  return queryOptions({
    queryKey: ['admin-timeline', params],
    queryFn: () => unwrap(api.GET('/admin/timeline', { params: { query: params } })),
  })
}
