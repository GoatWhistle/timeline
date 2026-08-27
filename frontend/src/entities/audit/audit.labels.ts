import type { AuditAction, EntityType } from '@/shared/api/types.gen'

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  USER: 'Пользователь',
  INVITE: 'Приглашение',
  EVENT: 'Событие',
  STAGE: 'Этап',
  EVENT_PARTICIPANT: 'Участник',
  REGISTRATION: 'Регистрация',
  REGISTRATION_STATUS: 'Статус регистрации',
  NOTIFICATION_RULE: 'Правило уведомления',
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  USER_REGISTER: 'Регистрация пользователя',
  USER_DEACTIVATE: 'Деактивация пользователя',
  USER_ACTIVATE: 'Активация пользователя',
  USER_DELETE: 'Удаление пользователя',
  USER_PROFILE_CHANGE: 'Изменение профиля',
  USER_ADMIN_FLAG_CHANGE: 'Изменение прав администратора',
  INVITE_CREATE: 'Создание приглашения',
  INVITE_REVOKE: 'Отзыв приглашения',
  INVITE_ACCEPT: 'Принятие приглашения',
  EVENT_CREATE: 'Создание события',
  EVENT_UPDATE: 'Изменение события',
  EVENT_PUBLISH: 'Публикация события',
  EVENT_ARCHIVE: 'Архивирование события',
  STAGE_CREATE: 'Создание этапа',
  STAGE_UPDATE: 'Изменение этапа',
  STAGE_DELETE: 'Удаление этапа',
  PARTICIPANT_ADD: 'Добавление участника',
  PARTICIPANT_REMOVE: 'Удаление участника',
  PARTICIPANT_REACTIVATE: 'Реактивация участника',
  TEAM_ROLE_CHANGE: 'Изменение роли',
  REGISTRATION_CHANGE: 'Изменение регистрации',
  STATUS_CHANGE: 'Изменение статуса',
  RULE_CHANGE: 'Изменение правила',
}

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]
export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABEL) as EntityType[]
