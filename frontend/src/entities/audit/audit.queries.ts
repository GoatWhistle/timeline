import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

export type AuditParams = QueryParams<'/admin/audit', 'get'>

export function auditQuery(params: AuditParams) {
  return queryOptions({
    queryKey: ['audit', params],
    queryFn: () => unwrap(api.GET('/admin/audit', { params: { query: params } })),
  })
}
