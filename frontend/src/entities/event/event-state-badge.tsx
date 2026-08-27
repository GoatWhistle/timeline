import { EVENT_STATE_COLOR, EVENT_STATE_LABEL } from '@/entities/event/event.labels'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
} from '@/entities/registration/registration.labels'
import type { EventState, RegistrationStatusValue } from '@/shared/api/types.gen'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'

export function EventStateBadge({ state }: { state: EventState }) {
  return (
    <Badge tone="outline">
      <Dot className={EVENT_STATE_COLOR[state]} />
      {EVENT_STATE_LABEL[state]}
    </Badge>
  )
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatusValue }) {
  return (
    <Badge tone="outline">
      <Dot className={REGISTRATION_STATUS_COLOR[status]} />
      {REGISTRATION_STATUS_LABEL[status]}
    </Badge>
  )
}
