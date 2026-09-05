import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useParams } from 'react-router'
import { teamEventEntryQuery } from '@/entities/team/team.queries'
import { TeamTrackPicker } from '@/features/tracks/team-track-picker'
import type { TeamEventEntryResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'
import { QueryBoundary } from '@/shared/ui/states'
import { RosterTable } from './roster-table'
import { useTeamContext } from './team-context'
import { TeamLinksCard } from './team-links/team-links-card'

function limitsKey(entry: TeamEventEntryResponse): string {
  const { team_size_min: min, team_size_max: max } = entry
  if (min !== undefined && max !== undefined) return 'rosterLimits'
  if (min !== undefined) return 'rosterMin'
  if (max !== undefined) return 'rosterMax'
  return 'rosterNoLimits'
}

export function TeamEventDetail() {
  const { t } = useTranslation('team')
  const { teamId, detail, isLead } = useTeamContext()
  const { eventId = '' } = useParams()
  const query = useQuery(teamEventEntryQuery(teamId, eventId))

  const entry = query.data

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <NavLink
        to={`/teams/${teamId}/events`}
        className={cn(
          'inline-flex w-fit items-center gap-1.5 text-meta text-muted-foreground',
          'hover:text-foreground transition-colors duration-instant ease-out',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('events')}
      </NavLink>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={entry !== undefined}
        shape="unknown"
      >
        {entry && (
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-heading">{entry.event_title}</h2>
                  <p className="mt-1 text-meta text-muted-foreground">
                    {t(limitsKey(entry), {
                      min: entry.team_size_min,
                      max: entry.team_size_max,
                    })}
                  </p>
                </div>
                <Badge tone={entry.registered ? 'primary' : 'neutral'} className="shrink-0">
                  {t(entry.registered ? 'teamRegistered' : 'teamNotRegistered')}
                </Badge>
              </div>
              <p className="text-meta text-muted-foreground">
                {t('registeredCount', {
                  done: entry.registered_count,
                  total: entry.roster_size,
                })}
                <span className="ml-2 opacity-80">{t('derivedHint')}</span>
              </p>
            </div>

            <Card>
              <CardContent className="flex flex-col gap-6">
                <TeamTrackPicker teamId={teamId} entry={entry} isLead={isLead} />
                <RosterTable
                  teamId={teamId}
                  entry={entry}
                  members={detail.members}
                  isLead={isLead}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <TeamLinksCard teamId={teamId} eventId={entry.event_id} />
              </CardContent>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
