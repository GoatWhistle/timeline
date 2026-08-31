import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { eventCardQuery } from '@/entities/event/event.queries'
import { StatusWithHint } from '@/entities/registration/status-hint/status-hint'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import { useSession } from '@/shared/api/session'
import { formatDateRange } from '@/shared/datetime/datetime'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { Badge } from '@/shared/ui/primitives/badge'
import { SkeletonDetail, useLoadingIndicator } from '@/shared/ui/states'
import { EventDetailView, SectionTitle } from './event-detail-view'
import { TeamProgressBar } from './team-progress/team-progress-bar'

export function EventDetailPane({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('event')
  const { isAdmin } = useSession()
  const query = useQuery(eventCardQuery(id))
  const indicator = useLoadingIndicator({
    isPending: query.isPending,
    isFetching: query.isFetching,
    hasData: query.data !== undefined,
  })

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!query.data) return indicator === 'skeleton' ? <SkeletonDetail /> : null

  const card = query.data
  const { event, registration, registration_status: status } = card

  return (
    <TooltipProvider>
      <div className={indicator === 'stale' ? 'opacity-60 transition-opacity duration-fast' : ''}>
        <EventDetailView
          event={event}
          registration={registration}
          status={status?.status ?? null}
          detailPath={`/events/${id}`}
          onClose={onClose}
        >
          {status && (
            <section className="flex flex-col gap-2.5">
              <SectionTitle>{t('detail.status')}</SectionTitle>
              <div>
                <StatusWithHint status={status.status} />
              </div>
              <TeamProgressBar eventId={id} enabled={isAdmin} />
            </section>
          )}

          <section className="flex flex-col gap-2">
            <SectionTitle>{t('detail.stages')}</SectionTitle>
            {card.stages.length === 0 ? (
              <p className="text-meta text-muted-foreground">{t('card.noStages')}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {card.stages.map((stage) => (
                  <li key={stage.id} className="flex items-start gap-2">
                    <StageTypeMark type={stage.type} labelled={false} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-copy">{stage.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
                        <Badge tone="neutral">{t(STAGE_TYPE_KEY[stage.type])}</Badge>
                        <span>{formatDateRange(stage.start_at, stage.end_at)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </EventDetailView>
      </div>
    </TooltipProvider>
  )
}
