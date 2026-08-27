import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { overdueQuery, upcomingQuery } from '@/entities/deadline/deadline.queries'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
} from '@/entities/registration/registration.labels'
import type { DeadlineItem, DeadlinePage } from '@/shared/api/types.gen'
import { formatDateTime, formatOffsetMinutes, formatRelative } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'
import { Dot } from '@/shared/ui/primitives/dot'

const WINDOWS = [
  { value: '24', label: 'ближайшие сутки' },
  { value: '72', label: 'ближайшие 3 дня' },
  { value: '168', label: 'ближайшая неделя' },
]

const DEFAULTS = { tab: 'upcoming', within: '72' }

function DeadlineTable({
  data,
  emptyTitle,
  showOverdue,
  onPageChange,
}: {
  data: DeadlinePage
  emptyTitle: string
  showOverdue: boolean
  onPageChange: (page: number) => void
}) {
  if (data.items.length === 0) return <EmptyState title={emptyTitle} />

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Участник</TableHead>
            <TableHead>Событие</TableHead>
            <TableHead>Дедлайн</TableHead>
            <TableHead>{showOverdue ? 'Просрочка' : 'Осталось'}</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item: DeadlineItem) => (
            <TableRow key={`${item.participant_id}-${item.event_id}`}>
              <TableCell>
                <span className="font-medium">{item.user.display_name}</span>
                <span className="ml-2 text-muted-foreground">{item.user.email}</span>
              </TableCell>
              <TableCell>
                <Link
                  to={`/admin/events/${item.event_id}`}
                  className="text-primary hover:underline"
                >
                  {item.event_title}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(item.deadline_at)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {showOverdue && item.overdue_minutes !== undefined
                  ? formatOffsetMinutes(-item.overdue_minutes).replace(' после дедлайна', '')
                  : formatRelative(item.deadline_at)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <Dot className={REGISTRATION_STATUS_COLOR[item.status]} />
                  {REGISTRATION_STATUS_LABEL[item.status]}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </div>
  )
}

export function AdminDeadlinesPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const tab = filters.tab === 'overdue' ? 'overdue' : 'upcoming'

  const upcoming = useQuery({
    ...upcomingQuery({ page, within_hours: Number(filters.within) }),
    enabled: tab === 'upcoming',
  })
  const overdue = useQuery({ ...overdueQuery(page), enabled: tab === 'overdue' })

  const active = tab === 'upcoming' ? upcoming : overdue

  return (
    <div>
      <PageHeader
        title="Дедлайны регистрации"
        description="Участники, которые ещё не отметили регистрацию"
        actions={
          tab === 'upcoming' ? (
            <div className="w-56">
              <Select
                value={filters.within}
                onValueChange={(value) => setFilters({ within: value })}
              >
                <SelectTrigger aria-label="Окно">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WINDOWS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(value) => setFilters({ tab: value })}>
        <TabsList>
          <TabsTrigger value="upcoming">Приближаются</TabsTrigger>
          <TabsTrigger value="overdue">Просрочены</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.isPending && <LoadingState />}
          {upcoming.isError && (
            <ErrorState error={upcoming.error} onRetry={() => upcoming.refetch()} />
          )}
          {upcoming.data && (
            <DeadlineTable
              data={upcoming.data}
              emptyTitle="Ближайших дедлайнов нет"
              showOverdue={false}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="overdue">
          {overdue.isPending && <LoadingState />}
          {overdue.isError && (
            <ErrorState error={overdue.error} onRetry={() => overdue.refetch()} />
          )}
          {overdue.data && (
            <DeadlineTable
              data={overdue.data}
              emptyTitle="Просроченных дедлайнов нет"
              showOverdue
              onPageChange={setPage}
            />
          )}
        </TabsContent>
      </Tabs>

      {active.isError && null}
    </div>
  )
}
