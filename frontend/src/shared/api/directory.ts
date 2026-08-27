import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'
import type { QueryParams } from './params'

export type UsersParams = QueryParams<'/admin/users', 'get'>

export function usersQuery(params: UsersParams) {
  return queryOptions({
    queryKey: ['admin-users', params],
    queryFn: () => unwrap(api.GET('/admin/users', { params: { query: params } })),
  })
}
