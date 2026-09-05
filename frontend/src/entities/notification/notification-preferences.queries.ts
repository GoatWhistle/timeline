import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { Channel, NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'

const notificationPreferencesQueryKey = ['notification-preferences'] as const

export function notificationPreferencesQuery(enabled = true) {
  return {
    queryKey: notificationPreferencesQueryKey,
    queryFn: async () => (await unwrap(api.GET('/me/notification-preferences'))).preferences,
    enabled,
  }
}

export function useNotificationPreferences(enabled = true) {
  return useQuery(notificationPreferencesQuery(enabled))
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient()
  return useMutation<
    NotificationPreference[],
    Error,
    { occasion: NotificationOccasion; channel: Channel; enabled: boolean }
  >({
    mutationFn: async ({ occasion, channel, enabled }) =>
      (
        await unwrap(
          api.PUT('/me/notification-preferences/{occasion}/{channel}', {
            params: { path: { occasion, channel } },
            body: { enabled },
          }),
        )
      ).preferences,
    onSuccess: (preferences) =>
      queryClient.setQueryData(notificationPreferencesQueryKey, preferences),
  })
}
