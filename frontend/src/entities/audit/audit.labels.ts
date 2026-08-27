import type { AuditAction, EntityType } from '@/shared/api/types.gen'

export const ENTITY_TYPES: EntityType[] = [
  'USER',
  'INVITE',
  'EVENT',
  'STAGE',
  'EVENT_PARTICIPANT',
  'REGISTRATION',
  'REGISTRATION_STATUS',
  'NOTIFICATION_RULE',
]

export const AUDIT_ACTIONS: AuditAction[] = [
  'USER_REGISTER',
  'USER_DEACTIVATE',
  'USER_ACTIVATE',
  'USER_DELETE',
  'USER_PROFILE_CHANGE',
  'USER_ADMIN_FLAG_CHANGE',
  'INVITE_CREATE',
  'INVITE_REVOKE',
  'INVITE_ACCEPT',
  'EVENT_CREATE',
  'EVENT_UPDATE',
  'EVENT_PUBLISH',
  'EVENT_ARCHIVE',
  'STAGE_CREATE',
  'STAGE_UPDATE',
  'STAGE_DELETE',
  'PARTICIPANT_ADD',
  'PARTICIPANT_REMOVE',
  'PARTICIPANT_REACTIVATE',
  'TEAM_ROLE_CHANGE',
  'REGISTRATION_CHANGE',
  'STATUS_CHANGE',
  'RULE_CHANGE',
]

export function entityTypeKey(value: EntityType): string {
  return `audit.entityType.${value}`
}

export function auditActionKey(value: AuditAction): string {
  return `audit.actionLabel.${value}`
}
