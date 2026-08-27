import type { Channel, NotificationType } from '@/shared/api/types.gen'

export const CHANNEL_LABEL: Record<Channel, string> = {
  TELEGRAM: 'Telegram',
  EMAIL: 'Email',
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  REGISTRATION_REQUIRED: 'Требуется регистрация',
  REGISTRATION_REMINDER: 'Напоминание',
  REGISTRATION_OVERDUE: 'Просрочка',
}
