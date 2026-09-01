import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { teamEventsQuery } from '@/entities/team/team.queries'
import type { TeamMemberResponse } from '@/shared/api/types.gen'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'
import { EnterEventDialog } from './enter-event-dialog'
import { TeamEventCard } from './team-event-card'

export function TeamEvents({
  teamId,
  members,
  isLead,
}: {
  teamId: string
  members: TeamMemberResponse[]
  isLead: boolean
}) {
  const { t } = useTranslation('team')
  const [entering, setEntering] = useState(false)
  const query = useQuery(teamEventsQuery(teamId))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-heading">{t('events')}</h2>
          <p className="text-meta text-muted-foreground">{t('selfReportHint')}</p>
        </div>
        {isLead && (
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
        {query.data && query.data.items.length === 0 ? (
          <EmptyState title={t('eventsEmpty')} />
        ) : (
          <div className="flex flex-col gap-4">
            {(query.data?.items ?? []).map((entry) => (
              <TeamEventCard
                key={entry.id}
                teamId={teamId}
                entry={entry}
                members={members}
                isLead={isLead}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <EnterEventDialog teamId={teamId} open={entering} onOpenChange={setEntering} />
    </section>
  )
}
