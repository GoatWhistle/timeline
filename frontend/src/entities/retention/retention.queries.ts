import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventKeys } from '@/entities/event/event.queries'
import { api, unwrap } from '@/shared/api/client'
import type {
  EventResponse,
  RetentionSettingsResponse,
  UpdateRetentionSettingsRequest,
} from '@/shared/api/types.gen'

export const retentionKeys = {
  settings: ['retention-settings'] as const,
}

export function retentionSettingsQuery() {
  return queryOptions({
    queryKey: retentionKeys.settings,
    queryFn: () => unwrap(api.GET('/admin/retention-settings')),
  })
}

export function useUpdateRetentionSettings() {
  const queryClient = useQueryClient()
  return useMutation<RetentionSettingsResponse, Error, UpdateRetentionSettingsRequest>({
    mutationFn: (body) => unwrap(api.PATCH('/admin/retention-settings', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: retentionKeys.settings }),
  })
}

export function useCancelPurge(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, void>({
    mutationFn: () =>
      unwrap(api.POST('/admin/events/{id}/purge-cancel', { params: { path: { id: eventId } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(eventId) })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}
