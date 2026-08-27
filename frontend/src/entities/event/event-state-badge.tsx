import { useTranslation } from 'react-i18next'
import { EVENT_STATE_COLOR, EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
} from '@/entities/registration/registration.labels'
import type { EventState, RegistrationStatusValue } from '@/shared/api/types.gen'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'

export function EventStateBadge({ state }: { state: EventState }) {
  const { t } = useTranslation()

  return (
    <Badge tone="outline">
      <Dot className={EVENT_STATE_COLOR[state]} />
      {t(EVENT_STATE_KEY[state])}
    </Badge>
  )
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatusValue }) {
  const { t } = useTranslation()

  return (
    <Badge tone="outline">
      <Dot className={REGISTRATION_STATUS_COLOR[status]} />
      {t(REGISTRATION_STATUS_KEY[status])}
    </Badge>
  )
}
