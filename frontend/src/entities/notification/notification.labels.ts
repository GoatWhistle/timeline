import type { Channel, NotificationType } from '@/shared/api/types.gen'

export const CHANNEL_KEY: Record<Channel, string> = {
  TELEGRAM: 'notification:channel.TELEGRAM',
  EMAIL: 'notification:channel.EMAIL',
}

export const NOTIFICATION_TYPE_KEY: Record<NotificationType, string> = {
  REGISTRATION_REQUIRED: 'notification:type.REGISTRATION_REQUIRED',
  REGISTRATION_REMINDER: 'notification:type.REGISTRATION_REMINDER',
  REGISTRATION_OVERDUE: 'notification:type.REGISTRATION_OVERDUE',
}
