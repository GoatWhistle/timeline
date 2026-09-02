import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { teamsQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { TeamFigure } from '@/shared/ui/data-display/empty-figures/people-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Card } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'
import { CreateTeamDialog } from './create-team-dialog'

export function TeamsPage() {
  const { t } = useTranslation('team')
  const [creating, setCreating] = useState(false)
  const query = useQuery(teamsQuery())

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            {t('create')}
          </Button>
        }
      />

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
          <EmptyState
            title={t('empty')}
            description={t('emptyHint')}
            figure={TeamFigure}
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                {t('create')}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {(query.data?.items ?? []).map((team) => (
              <li key={team.id}>
                <NavLink
                  to={`/teams/${team.id}`}
                  className={cn(
                    'block rounded-lg',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  )}
                >
                  <Card
                    className={cn(
                      'flex items-center justify-between gap-4 p-4',
                      'motion-safe:transition-colors motion-safe:duration-instant motion-safe:ease-out',
                      'hover:bg-surface-2',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-copy">{team.name}</p>
                      <p className="truncate text-meta text-muted-foreground">
                        {t('lead')}: {team.lead.display_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {team.my_state === 'INVITED' && (
                        <Badge tone="primary">{t('stateInvited')}</Badge>
                      )}
                      {team.is_lead && <Badge tone="outline">{t('lead')}</Badge>}
                    </div>
                  </Card>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
