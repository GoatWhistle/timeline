import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { eventCardQuery, useMarkRegistrationDone } from '@/entities/event/event.queries'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { EventCover } from '@/features/event-cover'
import { LinkList } from '@/features/event-links/ui/link-list/link-list'
import { PinnedLinks } from '@/features/event-links/ui/pinned-links/pinned-links'
import { PersonalSection } from '@/features/personal-layer'
import type { EventCard } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { EventFacts } from './event-facts'
import { EventPlaceSummary } from './event-place-summary'
import { RegistrationSection, StagesSection } from './event-sections'

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
  const { event } = card

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <PageHeader
        title={event.title}
        description={
          event.organizer
            ? `${event.organizer} · ${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
            : `${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
        }
        actions={<EventStateBadge state={event.state} />}
      />

      <EventCover
        coverUrl={event.cover_url}
        title={event.title}
        className="aspect-[4/1] w-full rounded-surface"
      />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('card.participation')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="text-copy">
                  <p className="text-muted-foreground">{t('card.teamRole')}</p>
                  <p className="font-medium">{card.team_role ?? '—'}</p>
                </div>
                <div className="text-copy">
                  <p className="text-muted-foreground">{t('card.nextStage')}</p>
                  <p className="font-medium">
                    {card.next_stage
                      ? `${card.next_stage.name} · ${formatDate(card.next_stage.start_at)}`
                      : '—'}
                  </p>
                </div>
              </div>

              <EventPlaceSummary event={event} stages={card.stages} />

              <PinnedLinks eventId={event.id} />

              {event.description && (
                <div className="text-copy">
                  <p className="text-muted-foreground">{t('card.description')}</p>
                  <p className="max-w-prose [text-wrap:pretty]">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <RegistrationSection card={card} onMarkDone={onMarkDone} pending={pending} />

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <StagesSection stages={card.stages} />

            <Card>
              <CardHeader>
                <CardTitle>{t('links.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <LinkList eventId={event.id} stages={card.stages} />
              </CardContent>
            </Card>
          </div>

          <PersonalSection eventId={event.id} stages={card.stages} />
        </div>

        <aside className="xl:sticky xl:top-4">
          <Card>
            <CardContent className="pt-6">
              <EventFacts event={event} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
