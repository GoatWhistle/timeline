import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { eventCardQuery, useMarkRegistrationDone } from '@/entities/event/event.queries'
import { EventStateBadge, RegistrationStatusBadge } from '@/entities/event/event-state-badge'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import { LinkList } from '@/features/event-links/ui/link-list/link-list'
import { PinnedLinks } from '@/features/event-links/ui/pinned-links/pinned-links'
import type { EventCard } from '@/shared/api/types.gen'
import { formatDate, formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { DeadlineTime } from '@/shared/ui/primitives/deadline-time/deadline-time'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { EventPlaceSummary } from './event-place-summary'

export function EventCardPage() {
  const { t } = useTranslation('event')
  const { id = '' } = useParams()
  const query = useQuery(eventCardQuery(id))
  const markDone = useMarkRegistrationDone(id)

  const card = query.data

  async function onMarkDone() {
    try {
      await markDone.mutateAsync()
      toast.success(t('card.marked'), {
        description: t('card.markedHint'),
      })
    } catch {
      toast.error(t('card.markFailed'))
    }
  }

  return (
    <QueryBoundary
      isPending={query.isPending}
      isFetching={query.isFetching}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      hasData={card !== undefined}
      skeleton={<SkeletonDetail />}
    >
      {card && <EventCardBody card={card} onMarkDone={onMarkDone} pending={markDone.isPending} />}
    </QueryBoundary>
  )
}

function EventCardBody({
  card,
  onMarkDone,
  pending,
}: {
  card: EventCard
  onMarkDone: () => void
  pending: boolean
}) {
  const { t } = useTranslation('event')
  const { event, registration, registration_status: status } = card

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={event.title}
        description={
          event.organizer
            ? `${event.organizer} · ${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
            : `${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
        }
        actions={<EventStateBadge state={event.state} />}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('card.participation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-copy">
            <div>
              <p className="text-muted-foreground">{t('card.teamRole')}</p>
              <p className="font-medium">{card.team_role ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('card.nextStage')}</p>
              <p className="font-medium">
                {card.next_stage
                  ? `${card.next_stage.name} · ${formatDate(card.next_stage.start_at)}`
                  : '—'}
              </p>
            </div>
            <div className="col-span-2">
              <EventPlaceSummary event={event} stages={card.stages} />
            </div>
            <div className="col-span-2">
              <PinnedLinks eventId={event.id} />
            </div>
            {event.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('card.description')}</p>
                <p>{event.description}</p>
              </div>
            )}
            {event.website_url && (
              <div className="col-span-2">
                <ExternalLink className="text-primary hover:underline" href={event.website_url}>
                  {t('card.website')}
                </ExternalLink>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('links.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkList eventId={event.id} stages={card.stages} />
          </CardContent>
        </Card>

        {registration && (
          <Card>
            <CardHeader>
              <CardTitle>{t('card.registration')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
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

              {registration.description && <p className="text-copy">{registration.description}</p>}

              <div className="flex items-center gap-3">
                <Button asChild variant="outline">
                  <ExternalLink href={registration.url}>{t('card.goToRegistration')}</ExternalLink>
                </Button>

                {card.can_mark_done && (
                  <Button onClick={onMarkDone} disabled={pending}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
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
              <p className="text-muted-foreground text-caption">{t('card.selfReport')}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('card.stages')}</CardTitle>
          </CardHeader>
          <CardContent>
            {card.stages.length === 0 ? (
              <p className="text-muted-foreground text-copy">{t('card.noStages')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {card.stages.map((stage) => (
                  <li key={stage.id} className="flex items-start gap-3">
                    <StageTypeMark type={stage.type} labelled={false} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-copy">{stage.name}</p>
                      <p className="text-muted-foreground text-copy">
                        <Badge tone="neutral">{t(STAGE_TYPE_KEY[stage.type])}</Badge>
                        <span className="ml-2">
                          {formatDate(stage.start_at)} — {formatDate(stage.end_at)}
                        </span>
                      </p>
                      {stage.description && <p className="text-copy">{stage.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
