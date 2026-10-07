import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

const catalogKeys = {
  list: (params: Record<string, unknown>) => ['catalog', params] as const,
  event: (id: string) => ['catalog', 'event', id] as const,
}

export type CatalogParams = QueryParams<'/catalog', 'get'>

export function catalogQuery(params: CatalogParams) {
  return queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: () => unwrap(api.GET('/catalog', { params: { query: params } })),
  })
}

export function catalogEventQuery(id: string) {
  return queryOptions({
    queryKey: catalogKeys.event(id),
    queryFn: () => unwrap(api.GET('/catalog/{id}', { params: { path: { id } } })),
  })
}
