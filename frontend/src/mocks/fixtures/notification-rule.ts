import type { NotificationRuleResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { registrations } from './registration'

export const notificationRules: NotificationRuleResponse[] = [
  {
    id: 'e1000000-0000-4000-8000-000000000001',
    registration_id: registrations[0]!.id,
    offset_minutes: 4320,
    slot_no: 1,
    enabled: true,
    type: 'REGISTRATION_REMINDER',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e1000000-0000-4000-8000-000000000002',
    registration_id: registrations[0]!.id,
    offset_minutes: 1440,
    slot_no: 2,
    enabled: true,
    type: 'REGISTRATION_REMINDER',
    channel_override: 'TELEGRAM',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e1000000-0000-4000-8000-000000000003',
    registration_id: registrations[0]!.id,
    offset_minutes: -120,
    slot_no: 3,
    enabled: true,
    type: 'REGISTRATION_OVERDUE',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e2000000-0000-4000-8000-000000000001',
    registration_id: registrations[1]!.id,
    offset_minutes: 60,
    slot_no: 1,
    enabled: false,
    type: 'REGISTRATION_REMINDER',
    created_at: at(-40),
    updated_at: at(-8),
  },
]
