import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams } from 'react-router'
import { teamQuery } from '@/entities/team/team.queries'
import { PageToolbar } from '@/shared/ui/layout/list-toolbar'
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
          <>
            <PageToolbar
              title={team.name}
              back={{ to: '/teams', label: t('title') }}
              tools={<TeamSectionNav teamId={id} />}
              end={<TeamOwnActions teamId={id} team={team} />}
            />
            <p
              data-team-byline=""
              className="mb-6 flex flex-wrap items-center gap-2 text-meta text-muted-foreground"
            >
              {t('lead')}: {team.lead.display_name}
              {team.my_state === 'INVITED' && <Badge tone="primary">{t('stateInvited')}</Badge>}
            </p>

            <Outlet context={{ teamId: id, detail: query.data, isLead: team.is_lead === true }} />
          </>
        )}
      </QueryBoundary>
    </div>
  )
}
