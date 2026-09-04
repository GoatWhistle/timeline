import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { teamEventsQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { EventListFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Card } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'
import { EnterEventDialog } from './enter-event-dialog'
import { useTeamContext } from './team-context'

export function TeamEvents() {
  const { t } = useTranslation('team')
  const { teamId, isLead } = useTeamContext()
  const [entering, setEntering] = useState(false)
  const query = useQuery(teamEventsQuery(teamId))

  const entries = query.data?.items ?? []

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-heading">{t('events')}</h2>
          <p className="text-meta text-muted-foreground">{t('selfReportHint')}</p>
        </div>
        {isLead && entries.length > 0 && (
          <Button variant="outline" onClick={() => setEntering(true)}>
            <Plus aria-hidden="true" />
            {t('enterEvent')}
          </Button>
        )}
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        shape="unknown"
      >
        {query.data && entries.length === 0 ? (
          <EmptyState
            title={t('eventsEmpty')}
            figure={EventListFigure}
            action={
              isLead ? (
                <Button onClick={() => setEntering(true)}>
                  <Plus aria-hidden="true" />
                  {t('enterEvent')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                <NavLink
                  to={`/teams/${teamId}/events/${entry.event_id}`}
                  className={cn(
                    'block rounded-surface',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  )}
                >
                  <Card
                    className={cn(
                      'flex items-center gap-3 p-4',
                      'transition-colors duration-instant ease-out',
                      'hover:bg-surface-2',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="truncate font-medium text-copy">{entry.event_title}</p>
                      <p className="truncate text-meta text-muted-foreground">
                        {t('registeredCount', {
                          done: entry.registered_count,
                          total: entry.roster_size,
                        })}
                      </p>
                      <Badge
                        tone={entry.registered ? 'primary' : 'neutral'}
                        className="w-fit max-w-full"
                      >
                        <span className="truncate">
                          {t(entry.registered ? 'teamRegistered' : 'teamNotRegistered')}
                        </span>
                      </Badge>
                    </div>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Card>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <EnterEventDialog teamId={teamId} open={entering} onOpenChange={setEntering} />
    </section>
  )
}
