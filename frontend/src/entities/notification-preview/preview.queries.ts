import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'

type PreviewQuery = QueryParams<'/admin/registration-statuses/{id}/notification-preview', 'get'>

export type PreviewOccasion = PreviewQuery['occasion']
export type PreviewDaysBefore = PreviewQuery['days_before']

export function notificationPreviewQuery({
  statusId,
  occasion,
  daysBefore,
  enabled,
}: {
  statusId: string
  occasion?: PreviewOccasion
  daysBefore?: PreviewDaysBefore
  enabled: boolean
}) {
  return queryOptions({
    queryKey: ['notification-preview', statusId, occasion ?? null, daysBefore ?? null],
    queryFn: () =>
      unwrap(
        api.GET('/admin/registration-statuses/{id}/notification-preview', {
          params: {
            path: { id: statusId },
            query: {
              ...(occasion ? { occasion } : {}),
              ...(daysBefore ? { days_before: daysBefore } : {}),
            },
          },
        }),
      ),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}
