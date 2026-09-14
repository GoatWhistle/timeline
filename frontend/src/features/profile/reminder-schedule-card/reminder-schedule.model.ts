import {
  REMINDER_OCCASIONS,
  type ReminderOccasion,
} from '@/entities/notification/notification.labels'
import type { ReminderScheduleOccasion, ReminderScheduleResponse } from '@/shared/api/types.gen'

export function daysOf(schedule: ReminderScheduleResponse, occasion: ReminderOccasion): number[] {
  return schedule.occasions.find((entry) => entry.occasion === occasion)?.days_before ?? []
}

export function withOccasions(schedule: ReminderScheduleResponse): ReminderScheduleOccasion[] {
  return REMINDER_OCCASIONS.map((occasion) => ({
    occasion,
    days_before: daysOf(schedule, occasion),
  }))
}

export function toggleDay(
  schedule: ReminderScheduleResponse,
  target: ReminderOccasion,
  day: number,
  checked: boolean,
): ReminderScheduleOccasion[] {
  return withOccasions(schedule).map((entry) =>
    entry.occasion === target
      ? {
          occasion: entry.occasion,
          days_before: checked
            ? [...entry.days_before, day].sort((a, b) => a - b)
            : entry.days_before.filter((value) => value !== day),
        }
      : entry,
  )
}
