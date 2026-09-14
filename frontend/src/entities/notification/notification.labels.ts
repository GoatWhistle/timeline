import type { Channel, NotificationType, ReminderScheduleOccasion } from '@/shared/api/types.gen'

export const CHANNEL_KEY: Record<Channel, string> = {
  TELEGRAM: 'notification:channel.TELEGRAM',
  EMAIL: 'notification:channel.EMAIL',
}

export const NOTIFICATION_TYPE_KEY: Record<NotificationType, string> = {
  REGISTRATION_REQUIRED: 'notification:type.REGISTRATION_REQUIRED',
  REGISTRATION_OVERDUE: 'notification:type.REGISTRATION_OVERDUE',
  REMINDER_REGISTRATION_DEADLINE: 'notification:type.REMINDER_REGISTRATION_DEADLINE',
  REMINDER_EVENT_START: 'notification:type.REMINDER_EVENT_START',
  REMINDER_STAGE_START: 'notification:type.REMINDER_STAGE_START',
  REMINDER_EVENT_END: 'notification:type.REMINDER_EVENT_END',
  WEEKLY_DIGEST: 'notification:type.WEEKLY_DIGEST',
  PERSONAL_TASK_DUE: 'notification:type.PERSONAL_TASK_DUE',
  PERSONAL_RETROSPECTIVE_DUE: 'notification:type.PERSONAL_RETROSPECTIVE_DUE',
}

export type ReminderOccasion = ReminderScheduleOccasion['occasion']

export const REMINDER_OCCASIONS: ReminderOccasion[] = [
  'REMINDER_REGISTRATION_DEADLINE',
  'REMINDER_EVENT_START',
  'REMINDER_STAGE_START',
  'REMINDER_EVENT_END',
]
