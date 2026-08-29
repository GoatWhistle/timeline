import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'

export function notificationPreviewQuery({
  statusId,
  ruleId,
  enabled,
}: {
  statusId: string
  ruleId?: string
  enabled: boolean
}) {
  return queryOptions({
    queryKey: ['notification-preview', statusId, ruleId ?? null],
    queryFn: () =>
      unwrap(
        api.GET('/admin/registration-statuses/{id}/notification-preview', {
          params: {
            path: { id: statusId },
            query: ruleId ? { rule_id: ruleId } : {},
          },
        }),
      ),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}
