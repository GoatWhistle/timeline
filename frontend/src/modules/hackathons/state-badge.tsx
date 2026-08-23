import type { HackathonState, RegistrationStatusValue } from '@/shared/api/types.gen'
import {
  HACKATHON_STATE_COLOR,
  HACKATHON_STATE_LABEL,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
} from '@/shared/lib/enums'
import { Badge, Dot } from '@/shared/ui/badge'

export function HackathonStateBadge({ state }: { state: HackathonState }) {
  return (
    <Badge tone="outline">
      <Dot className={HACKATHON_STATE_COLOR[state]} />
      {HACKATHON_STATE_LABEL[state]}
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
