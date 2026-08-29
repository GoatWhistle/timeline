import type { EventState } from '@/shared/api/types.gen'
import type { DotShape } from '@/shared/ui/primitives/dot'

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

export const EVENT_STATE_SHAPE: Record<EventState, DotShape> = {
  UNPUBLISHED: 'square',
  UPCOMING: 'ring',
  ACTIVE: 'round',
  FINISHED: 'bar',
  ARCHIVED: 'diamond',
}

export const EVENT_STATES = Object.keys(EVENT_STATE_KEY) as EventState[]
