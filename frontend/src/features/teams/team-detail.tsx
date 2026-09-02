import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useParams } from 'react-router'
import { teamQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { QueryBoundary } from '@/shared/ui/states'
import { TeamEvents } from './team-events'
import { TeamMembers } from './team-members'
import { TeamOwnActions } from './team-own-actions'

export function TeamDetailPage() {
  const { t } = useTranslation('team')
  const { id = '' } = useParams()
  const query = useQuery(teamQuery(id))

  const team = query.data?.team
  const isLead = team?.is_lead === true

  return (
    <div>
      <NavLink
        to="/teams"
        className={cn(
          'mb-4 inline-flex items-center gap-1.5 text-meta text-muted-foreground',
          'transition-colors duration-instant ease-out hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('title')}
      </NavLink>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        shape="unknown"
      >
        {query.data && team && (
          <div className="flex flex-col gap-8">
            <div>
              <PageHeader
                title={team.name}
                description={`${t('lead')}: ${team.lead.display_name}`}
                actions={<TeamOwnActions teamId={id} team={team} />}
              />
              {!isLead && (
                <p
                  className={cn(
                    'rounded-surface border border-border border-dashed bg-surface-2 px-4 py-3',
                    'text-meta text-muted-foreground',
                  )}
                >
                  {t('readOnlyNotice')}
                </p>
              )}
              {team.my_state === 'INVITED' && (
                <Badge tone="primary" className="mt-3">
                  {t('stateInvited')}
                </Badge>
              )}
            </div>

            <TeamMembers teamId={id} members={query.data.members} isLead={isLead} />
            <TeamEvents teamId={id} members={query.data.members} isLead={isLead} />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
