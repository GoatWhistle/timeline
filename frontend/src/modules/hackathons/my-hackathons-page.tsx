import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate, formatRelative } from '@/shared/lib/datetime'
import { usePageParam, useUrlFilters } from '@/shared/lib/use-url-filters'
import { Card, CardContent } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { Pagination } from '@/shared/ui/pagination'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { myHackathonsQuery } from './api'
import { HackathonStateBadge, RegistrationStatusBadge } from './state-badge'

const DEFAULTS = { archived: undefined as string | undefined }

export function MyHackathonsPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const includeArchived = filters.archived === '1'

  const query = useQuery(myHackathonsQuery({ include_archived: includeArchived, page }))

  return (
    <div>
      <PageHeader
        title="Мои хакатоны"
        description="Хакатоны, на которые вы назначены"
        actions={
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-archived"
              checked={includeArchived}
              onCheckedChange={(checked) =>
                setFilters({ archived: checked === true ? '1' : undefined })
              }
            />
            <Label htmlFor="include-archived">Показывать архивные</Label>
          </div>
        }
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && (
        <EmptyState title="У вас пока нет назначенных хакатонов" />
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {query.data.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/hackathons/${item.id}`}
                      className="font-medium text-lg hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {item.organizer ? `${item.organizer} · ` : ''}
                      {formatDate(item.start_at)} — {formatDate(item.end_at)}
                    </p>
                    <p className="mt-1 text-sm">
                      Роль в команде: <span className="font-medium">{item.team_role}</span>
                    </p>
                    {item.next_stage && (
                      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground text-sm">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Ближайший этап: {item.next_stage.name} ·{' '}
                        {formatDate(item.next_stage.start_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <HackathonStateBadge state={item.state} />
                    {item.registration_status && (
                      <RegistrationStatusBadge status={item.registration_status.status} />
                    )}
                    {item.registration_deadline && (
                      <p className="text-muted-foreground text-xs">
                        Дедлайн регистрации {formatRelative(item.registration_deadline)}
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
