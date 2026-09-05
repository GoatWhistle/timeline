import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  EVENT_STATE_TEXT,
  EventStateSign,
} from '@/entities/event/event-state-mark/event-state-sign'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUS_SHAPE,
} from '@/entities/registration/registration.labels'
import type { EventState, RegistrationStatusValue } from '@/shared/api/types.gen'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'

export function EventStateBadge({ state }: { state: EventState }) {
  const { t } = useTranslation()

  return (
    <Badge tone="outline" data-event-state={state} className={EVENT_STATE_TEXT[state]}>
      {state === 'ACTIVE' && <EventStateSign state={state} />}
      {t(EVENT_STATE_KEY[state])}
    </Badge>
  )
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatusValue }) {
  const { t } = useTranslation()

  return (
    <Badge tone="outline">
      <Dot
        shape={REGISTRATION_STATUS_SHAPE[status]}
        className={REGISTRATION_STATUS_COLOR[status]}
      />
      {t(REGISTRATION_STATUS_KEY[status])}
    </Badge>
  )
}
