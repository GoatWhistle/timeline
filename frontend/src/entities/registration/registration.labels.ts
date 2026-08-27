import type {
  ChangeSource,
  RegistrationState,
  RegistrationStatusValue,
} from '@/shared/api/types.gen'

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

export const CHANGE_SOURCE_LABEL: Record<ChangeSource, string> = {
  SYSTEM: 'Система',
  USER: 'Пользователь',
  ADMIN: 'Администратор',
}

export const REGISTRATION_STATUSES = Object.keys(
  REGISTRATION_STATUS_LABEL,
) as RegistrationStatusValue[]
