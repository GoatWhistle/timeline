import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { myEventsQuery } from '@/entities/event/event.queries'
import { EventStateBadge, RegistrationStatusBadge } from '@/entities/event/event-state-badge'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'

const DEFAULTS = { archived: undefined as string | undefined }

export function MyEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const includeArchived = filters.archived === '1'

  const query = useQuery(myEventsQuery({ include_archived: includeArchived, page }))

  return (
    <div>
      <PageHeader
        title={t('list.myTitle')}
        description={t('list.myDescription')}
        actions={
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-archived"
              checked={includeArchived}
              onCheckedChange={(checked) =>
                setFilters({ archived: checked === true ? '1' : undefined })
              }
            />
            <Label htmlFor="include-archived">{t('list.showArchived')}</Label>
          </div>
        }
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && <EmptyState title={t('list.myEmpty')} />}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {query.data.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/events/${item.id}`} className="font-medium text-lg hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {item.organizer ? `${item.organizer} · ` : ''}
                      {formatDate(item.start_at)} — {formatDate(item.end_at)}
                    </p>
                    <p className="mt-1 text-sm">
                      {t('list.teamRole')} <span className="font-medium">{item.team_role}</span>
                    </p>
                    {item.next_stage && (
                      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground text-sm">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {t('list.nextStage', { name: item.next_stage.name })}{' '}
                        {formatDate(item.next_stage.start_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <EventStateBadge state={item.state} />
                    {item.registration_status && (
                      <RegistrationStatusBadge status={item.registration_status.status} />
                    )}
                    {item.registration_deadline && (
                      <p className="text-muted-foreground text-xs">
                        {t('list.registrationDeadline', {
                          relative: formatRelative(item.registration_deadline),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
