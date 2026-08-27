import type { EventState } from '@/shared/api/types.gen'

export const EVENT_STATE_LABEL: Record<EventState, string> = {
  UNPUBLISHED: 'Черновик',
  UPCOMING: 'Предстоит',
  ACTIVE: 'Идёт',
  FINISHED: 'Завершён',
  ARCHIVED: 'В архиве',
}

export const EVENT_STATE_COLOR: Record<EventState, string> = {
  UNPUBLISHED: 'bg-state-unpublished',
  UPCOMING: 'bg-state-upcoming',
  ACTIVE: 'bg-state-active',
  FINISHED: 'bg-state-finished',
  ARCHIVED: 'bg-state-archived',
}

export const EVENT_STATES = Object.keys(EVENT_STATE_LABEL) as EventState[]
