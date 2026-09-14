import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type {
  ReminderScheduleResponse,
  UpdateReminderScheduleRequest,
} from '@/shared/api/types.gen'

const reminderScheduleQueryKey = ['reminder-schedule'] as const

export function reminderScheduleQuery(enabled = true) {
  return queryOptions({
    queryKey: reminderScheduleQueryKey,
    queryFn: () => unwrap(api.GET('/me/reminder-schedule')),
    enabled,
  })
}

export function useReminderSchedule(enabled = true) {
  return useQuery(reminderScheduleQuery(enabled))
}

export function useUpdateReminderSchedule() {
  const queryClient = useQueryClient()
  return useMutation<ReminderScheduleResponse, Error, UpdateReminderScheduleRequest>({
    mutationFn: (body) => unwrap(api.PUT('/me/reminder-schedule', { body })),
    onSuccess: (schedule) => queryClient.setQueryData(reminderScheduleQueryKey, schedule),
  })
}
