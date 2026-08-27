import type { EventState } from '@/shared/api/types.gen'

export const EVENT_STATE_KEY: Record<EventState, string> = {
  UNPUBLISHED: 'event:state.UNPUBLISHED',
  UPCOMING: 'event:state.UPCOMING',
  ACTIVE: 'event:state.ACTIVE',
  FINISHED: 'event:state.FINISHED',
  ARCHIVED: 'event:state.ARCHIVED',
}

export const EVENT_STATE_COLOR: Record<EventState, string> = {
  UNPUBLISHED: 'bg-state-unpublished',
  UPCOMING: 'bg-state-upcoming',
  ACTIVE: 'bg-state-active',
  FINISHED: 'bg-state-finished',
  ARCHIVED: 'bg-state-archived',
}

export const EVENT_STATES = Object.keys(EVENT_STATE_KEY) as EventState[]
