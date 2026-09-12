import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { eventCardQuery, useMarkRegistrationDone } from '@/entities/event/event.queries'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { EventCover } from '@/features/event-cover'
import { LinkList } from '@/features/event-links/ui/link-list/link-list'
import { PinnedLinks } from '@/features/event-links/ui/pinned-links/pinned-links'
import { EventFinanceSection } from '@/features/finance/event-finance'
import { PersonalSection } from '@/features/personal-layer'
import type { EventCard } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { MarkdownView } from '@/shared/markdown/markdown-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { EventFacts } from './event-facts'
import { EventPlaceSummary } from './event-place-summary'
import { RegistrationSection, StagesSection } from './event-sections'
import { EventTracksSection } from './event-tracks'

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

export function ParticipationFigures({ card }: { card: EventCard }) {
  const { t } = useTranslation('event')
  const nextStage = card.next_stage
  if (!card.team_role && !nextStage) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {card.team_role && (
        <div className="text-copy">
          <p className="text-muted-foreground">{t('card.teamRole')}</p>
          <p className="font-medium">{card.team_role}</p>
        </div>
      )}
      {nextStage && (
        <div className="text-copy">
          <p className="text-muted-foreground">{t('card.nextStage')}</p>
          <p className="font-medium">{`${nextStage.name} · ${formatDate(nextStage.start_at)}`}</p>
        </div>
      )}
    </div>
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
    <div className={PAGE_WIDTH}>
      <PageHeader title={event.title} actions={<EventStateBadge state={event.state} />} />

      <EventCover
        coverUrl={event.cover_url}
        title={event.title}
        className="aspect-[16/9] w-full rounded-surface sm:aspect-[3/1] xl:aspect-[4/1]"
      />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
          <Card>
            <CardContent>
              <EventFacts event={event} />
            </CardContent>
          </Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('card.participation')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ParticipationFigures card={card} />

              <EventPlaceSummary event={event} stages={card.stages} />

              <PinnedLinks eventId={event.id} />

              {event.description && <MarkdownView source={event.description} />}
            </CardContent>
          </Card>

          <RegistrationSection card={card} onMarkDone={onMarkDone} pending={pending} />

          <EventTracksSection eventId={event.id} />

          <EventFinanceSection eventId={event.id} />

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <StagesSection
              stages={card.stages}
              registration={card.registration}
              registrationStatus={card.registration_status}
            />

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
      </div>
    </div>
  )
}
