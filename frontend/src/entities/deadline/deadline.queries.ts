import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type UpcomingParams = QueryParams<'/admin/queries/upcoming', 'get'>

export function upcomingQuery(params: UpcomingParams) {
  return queryOptions({
    queryKey: ['deadlines-upcoming', params],
    queryFn: () => unwrap(api.GET('/admin/queries/upcoming', { params: { query: params } })),
  })
}

export function overdueQuery(page: number) {
  return queryOptions({
    queryKey: ['deadlines-overdue', page],
    queryFn: () => unwrap(api.GET('/admin/queries/overdue', { params: { query: { page } } })),
  })
}
