import type { NotificationRuleResponse } from '@/shared/api/types.gen'
import { registrations } from '../fixtures'

export const registrationOf = (eventId: string) =>
  registrations.find((item) => item.event_id === eventId)

export const ruleType = (offsetMinutes: number): NotificationRuleResponse['type'] =>
  offsetMinutes < 0 ? 'REGISTRATION_OVERDUE' : 'REGISTRATION_REMINDER'
