import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { teamsQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { TeamFigure } from '@/shared/ui/data-display/empty-figures/people-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ListFootnote } from '@/shared/ui/data-display/list-footnote/list-footnote'
import { Card } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'
import { CreateTeamDialog } from './create-team-dialog'
import { TeamsSummary } from './teams-summary'

export function TeamsPage() {
  const { t } = useTranslation('team')
  const [creating, setCreating] = useState(false)
  const query = useQuery(teamsQuery())

  const empty = query.data !== undefined && query.data.items.length === 0

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          empty ? undefined : (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              {t('create')}
            </Button>
          )
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
          <div className="flex flex-col gap-4">
            <TeamsSummary teams={query.data?.items ?? []} />
            <ul className="flex flex-col gap-3">
              {(query.data?.items ?? []).map((team) => (
                <li key={team.id}>
                  <NavLink
                    to={`/teams/${team.id}`}
                    className={cn(
                      'block rounded-surface',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    )}
                  >
                    <Card
                      className={cn(
                        'flex items-center justify-between gap-4 p-4',
                        'transition-colors duration-instant ease-out',
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
            <ListFootnote text={t('footnote')} />
          </div>
        )}
      </QueryBoundary>

      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
