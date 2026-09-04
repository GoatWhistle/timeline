import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useParams } from 'react-router'
import { teamQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { QueryBoundary } from '@/shared/ui/states'
import { TeamOwnActions } from './team-own-actions'
import { TeamSectionNav } from './team-section-nav'

export function TeamLayout() {
  const { t } = useTranslation('team')
  const { id = '' } = useParams()
  const query = useQuery(teamQuery(id))

  const team = query.data?.team

  return (
    <div className="flex min-w-0 flex-col">
      <NavLink
        to="/teams"
        className={cn(
          'mb-4 inline-flex w-fit items-center gap-1.5 text-meta text-muted-foreground',
          'hover:text-foreground motion-safe:transition-colors motion-safe:duration-instant motion-safe:ease-out',
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
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              <PageHeader
                title={team.name}
                description={`${t('lead')}: ${team.lead.display_name}`}
                actions={<TeamOwnActions teamId={id} team={team} />}
              />
              {team.my_state === 'INVITED' && (
                <Badge tone="primary" className="w-fit">
                  {t('stateInvited')}
                </Badge>
              )}
              <TeamSectionNav teamId={id} />
            </div>

            <Outlet context={{ teamId: id, detail: query.data, isLead: team.is_lead === true }} />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
