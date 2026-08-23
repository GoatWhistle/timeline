import type {
  AuditAction,
  ChangeSource,
  Channel,
  EntityType,
  HackathonState,
  NotificationType,
  ParticipationStatus,
  RegistrationState,
  RegistrationStatusValue,
  StageType,
} from '@/shared/api/types.gen'

/** Русские подписи значений контракта. Язык интерфейса один (раздел 9.6 ТЗ). */

export const HACKATHON_STATE_LABEL: Record<HackathonState, string> = {
  UNPUBLISHED: 'Черновик',
  UPCOMING: 'Предстоит',
  ACTIVE: 'Идёт',
  FINISHED: 'Завершён',
  ARCHIVED: 'В архиве',
}

/** Цвет состояния берётся из токенов темы, а не задаётся в компонентах. */
export const HACKATHON_STATE_COLOR: Record<HackathonState, string> = {
  UNPUBLISHED: 'bg-state-unpublished',
  UPCOMING: 'bg-state-upcoming',
  ACTIVE: 'bg-state-active',
  FINISHED: 'bg-state-finished',
  ARCHIVED: 'bg-state-archived',
}

export const STAGE_TYPE_LABEL: Record<StageType, string> = {
  REGISTRATION: 'Регистрация',
  SELECTION: 'Отбор',
  PARTICIPATION: 'Участие',
  CHECKPOINT: 'Контрольная точка',
  SUBMISSION: 'Сдача решения',
  DEMO: 'Демонстрация',
  RESULTS: 'Результаты',
  OTHER: 'Другое',
}

export const STAGE_TYPE_COLOR: Record<StageType, string> = {
  REGISTRATION: 'bg-stage-registration',
  SELECTION: 'bg-stage-selection',
  PARTICIPATION: 'bg-stage-participation',
  CHECKPOINT: 'bg-stage-checkpoint',
  SUBMISSION: 'bg-stage-submission',
  DEMO: 'bg-stage-demo',
  RESULTS: 'bg-stage-results',
  OTHER: 'bg-stage-other',
}

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatusValue, string> = {
  TODO: 'Не выполнена',
  DONE: 'Выполнена',
  NOT_REQUIRED: 'Не требуется',
}

export const REGISTRATION_STATUS_COLOR: Record<RegistrationStatusValue, string> = {
  TODO: 'bg-status-todo',
  DONE: 'bg-status-done',
  NOT_REQUIRED: 'bg-status-not-required',
}

export const REGISTRATION_STATE_LABEL: Record<RegistrationState, string> = {
  ACTIVE: 'Активна',
  DISABLED: 'Выключена',
}

export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  ASSIGNED: 'Назначен',
  REMOVED: 'Удалён',
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  TELEGRAM: 'Telegram',
  EMAIL: 'Email',
}

export const CHANGE_SOURCE_LABEL: Record<ChangeSource, string> = {
  SYSTEM: 'Система',
  USER: 'Пользователь',
  ADMIN: 'Администратор',
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  REGISTRATION_REQUIRED: 'Требуется регистрация',
  REGISTRATION_REMINDER: 'Напоминание',
  REGISTRATION_OVERDUE: 'Просрочка',
}

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  USER: 'Пользователь',
  INVITE: 'Приглашение',
  HACKATHON: 'Хакатон',
  STAGE: 'Этап',
  HACKATHON_PARTICIPANT: 'Участник',
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
  HACKATHON_CREATE: 'Создание хакатона',
  HACKATHON_UPDATE: 'Изменение хакатона',
  HACKATHON_PUBLISH: 'Публикация хакатона',
  HACKATHON_ARCHIVE: 'Архивирование хакатона',
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

export const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[]
export const HACKATHON_STATES = Object.keys(HACKATHON_STATE_LABEL) as HackathonState[]
export const REGISTRATION_STATUSES = Object.keys(
  REGISTRATION_STATUS_LABEL,
) as RegistrationStatusValue[]
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]
export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABEL) as EntityType[]
