import { HttpResponse, http } from 'msw'
import type { AuditResponse } from '@/shared/api/types.gen'
import { auditLog } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, paginate } from '../http'

export const auditHandlers = [
  http.get(`${API}/admin/audit`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const entityType = url.searchParams.get('entity_type')
    const actor = url.searchParams.get('actor_user_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const items: AuditResponse[] = auditLog
      .filter((item) => (action ? item.action === action : true))
      .filter((item) => (entityType ? item.entity_type === entityType : true))
      .filter((item) => (actor ? item.actor_user_id === actor : true))
      .filter((item) => (from ? Date.parse(item.created_at) >= Date.parse(from) : true))
      .filter((item) => (to ? Date.parse(item.created_at) <= Date.parse(to) : true))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

    return HttpResponse.json(paginate(items, url))
  }),
]
