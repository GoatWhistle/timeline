import type {
  ChangeSource,
  RegistrationState,
  RegistrationStatusValue,
} from '@/shared/api/types.gen'
import type { DotShape } from '@/shared/ui/primitives/dot'

export const REGISTRATION_STATUS_KEY: Record<RegistrationStatusValue, string> = {
  TODO: 'registration:status.TODO',
  DONE: 'registration:status.DONE',
  NOT_REQUIRED: 'registration:status.NOT_REQUIRED',
}

export const REGISTRATION_STATUS_COLOR: Record<RegistrationStatusValue, string> = {
  TODO: 'bg-status-todo',
  DONE: 'bg-status-done',
  NOT_REQUIRED: 'bg-status-not-required',
}

export const REGISTRATION_STATUS_SHAPE: Record<RegistrationStatusValue, DotShape> = {
  TODO: 'ring',
  DONE: 'round',
  NOT_REQUIRED: 'square',
}

export const REGISTRATION_STATE_KEY: Record<RegistrationState, string> = {
  ACTIVE: 'registration:state.ACTIVE',
  DISABLED: 'registration:state.DISABLED',
}

export const CHANGE_SOURCE_KEY: Record<ChangeSource, string> = {
  SYSTEM: 'registration:changeSource.SYSTEM',
  USER: 'registration:changeSource.USER',
  ADMIN: 'registration:changeSource.ADMIN',
}

export const REGISTRATION_STATUSES = Object.keys(
  REGISTRATION_STATUS_KEY,
) as RegistrationStatusValue[]
