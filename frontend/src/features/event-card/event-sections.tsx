import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RegistrationStatusBadge } from '@/entities/event/event-state-badge'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import type { EventCard } from '@/shared/api/types.gen'
import { formatDateRange, formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { DeadlineTime } from '@/shared/ui/primitives/deadline-time/deadline-time'

function RegistrationStageRow({
  registration,
  status,
}: {
  registration: EventCard['registration']
  status: EventCard['registration_status']
}) {
  const { t } = useTranslation('event')

  if (!registration) {
    return (
      <li className="flex items-start gap-3">
        <StageTypeMark type="REGISTRATION" labelled={false} className="mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium text-copy">{t(STAGE_TYPE_KEY.REGISTRATION)}</p>
          <p className="text-muted-foreground text-copy">{t('card.noRegistration')}</p>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-start gap-3">
      <StageTypeMark type="REGISTRATION" labelled={false} className="mt-0.5" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-copy">
          {t(STAGE_TYPE_KEY.REGISTRATION)}
          {status && <RegistrationStatusBadge status={status.status} />}
        </p>
        <p className="text-muted-foreground text-copy">
          <Badge tone="neutral">{t('card.deadline')}</Badge>
          <span className="ml-2">
            <DeadlineTime iso={registration.deadline_at} className="inline-flex" />
          </span>
        </p>
        {registration.state === 'DISABLED' && (
          <p className="text-muted-foreground text-copy">{t('card.disabled')}</p>
        )}
      </div>
    </li>
  )
}

export function RegistrationSection({
  card,
  onMarkDone,
  pending,
}: {
  card: EventCard
  onMarkDone: () => void
  pending: boolean
}) {
  const { t } = useTranslation('event')
  const { registration, registration_status: status } = card
  if (!registration) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('card.registration')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-copy">
            <p className="text-muted-foreground">{t('card.deadline')}</p>
            <p className="font-medium">
              <DeadlineTime iso={registration.deadline_at} />
              {registration.deadline_at && (
                <span className="ml-2 text-muted-foreground">
                  ({formatRelative(registration.deadline_at)})
                </span>
              )}
            </p>
          </div>
          {status && <RegistrationStatusBadge status={status.status} />}
        </div>

        {registration.description && (
          <p className="max-w-prose text-copy">{registration.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <ExternalLink href={registration.url}>{t('card.goToRegistration')}</ExternalLink>
          </Button>

          {card.can_mark_done && (
            <Button onClick={onMarkDone} disabled={pending}>
              <CircleCheck className="size-4" aria-hidden="true" />
              {t('card.markRegistered')}
            </Button>
          )}
        </div>

        {status?.status === 'DONE' && status.registered_at && (
          <p className="text-muted-foreground text-copy">
            {t('card.markedAt', { date: formatDateTime(status.registered_at) })}
          </p>
        )}
        {registration.state === 'DISABLED' && (
          <p className="text-muted-foreground text-copy">{t('card.disabled')}</p>
        )}
        <p className="max-w-prose text-caption text-muted-foreground">{t('card.selfReport')}</p>
      </CardContent>
    </Card>
  )
}

export function StagesSection({
  stages,
  registration,
  registrationStatus,
}: {
  stages: EventCard['stages']
  registration?: EventCard['registration']
  registrationStatus?: EventCard['registration_status']
}) {
  const { t } = useTranslation('event')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('card.stages')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          <RegistrationStageRow registration={registration} status={registrationStatus} />
          {stages.length === 0 ? (
            <li className="text-muted-foreground text-copy">{t('card.noStages')}</li>
          ) : (
            stages.map((stage) => (
              <li key={stage.id} className="flex items-start gap-3">
                <StageTypeMark type={stage.type} labelled={false} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-copy">{stage.name}</p>
                  <p className="text-muted-foreground text-copy">
                    <Badge tone="neutral">{t(STAGE_TYPE_KEY[stage.type])}</Badge>
                    <span className="ml-2">{formatDateRange(stage.start_at, stage.end_at)}</span>
                  </p>
                  {stage.description && (
                    <p className="max-w-prose text-copy">{stage.description}</p>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
