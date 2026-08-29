import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { overdueQuery, upcomingQuery } from '@/entities/deadline/deadline.queries'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
} from '@/entities/registration/registration.labels'
import type { DeadlineItem, DeadlinePage } from '@/shared/api/types.gen'
import { formatDuration, formatRelative } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
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
import { DeadlineTime } from '@/shared/ui/primitives/deadline-time/deadline-time'
import { Dot } from '@/shared/ui/primitives/dot'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'

const WINDOWS = [
  { value: '24', labelKey: 'deadlines.window24' },
  { value: '72', labelKey: 'deadlines.window72' },
  { value: '168', labelKey: 'deadlines.window168' },
]

const DEFAULTS = { tab: 'upcoming', within: '72' }

function DeadlineTable({
  data,
  emptyTitle,
  showOverdue,
  onPageChange,
}: {
  data: DeadlinePage | undefined
  emptyTitle: string
  showOverdue: boolean
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation('event')
  const items = data?.items ?? []

  if (items.length === 0) return <EmptyState title={emptyTitle} />

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('deadlines.columnParticipant')}</TableHead>
            <TableHead>{t('deadlines.columnEvent')}</TableHead>
            <TableHead>{t('deadlines.columnDeadline')}</TableHead>
            <TableHead>
              {showOverdue ? t('deadlines.columnOverdue') : t('deadlines.columnLeft')}
            </TableHead>
            <TableHead>{t('deadlines.columnStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: DeadlineItem) => (
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
                <DeadlineTime iso={item.deadline_at} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {showOverdue && item.overdue_minutes !== undefined
                  ? formatDuration(item.overdue_minutes)
                  : formatRelative(item.deadline_at)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <Dot className={REGISTRATION_STATUS_COLOR[item.status]} />
                  {REGISTRATION_STATUS_KEY[item.status]}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data && <Pagination meta={data.meta} onPageChange={onPageChange} />}
    </div>
  )
}

export function AdminDeadlinesPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const tab = filters.tab === 'overdue' ? 'overdue' : 'upcoming'

  const upcoming = useQuery({
    ...upcomingQuery({ page, within_hours: Number(filters.within) }),
    enabled: tab === 'upcoming',
  })
  const overdue = useQuery({ ...overdueQuery(page), enabled: tab === 'overdue' })

  return (
    <div>
      <PageHeader
        title={t('deadlines.title')}
        description={t('deadlines.description')}
        actions={
          tab === 'upcoming' ? (
            <div className="w-56">
              <Select
                value={filters.within}
                onValueChange={(value) => setFilters({ within: value })}
              >
                <SelectTrigger aria-label={t('deadlines.windowAria')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WINDOWS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
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
          <TabsTrigger value="upcoming">{t('deadlines.tabUpcoming')}</TabsTrigger>
          <TabsTrigger value="overdue">{t('deadlines.tabOverdue')}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <QueryBoundary
            isPending={upcoming.isPending}
            isFetching={upcoming.isFetching}
            isError={upcoming.isError}
            error={upcoming.error}
            onRetry={() => upcoming.refetch()}
            hasData={upcoming.data !== undefined}
            skeleton={<SkeletonTable rows={8} columns={5} />}
          >
            <DeadlineTable
              data={upcoming.data}
              emptyTitle={t('deadlines.emptyUpcoming')}
              showOverdue={false}
              onPageChange={setPage}
            />
          </QueryBoundary>
        </TabsContent>

        <TabsContent value="overdue">
          <QueryBoundary
            isPending={overdue.isPending}
            isFetching={overdue.isFetching}
            isError={overdue.isError}
            error={overdue.error}
            onRetry={() => overdue.refetch()}
            hasData={overdue.data !== undefined}
            skeleton={<SkeletonTable rows={8} columns={5} />}
          >
            <DeadlineTable
              data={overdue.data}
              emptyTitle={t('deadlines.emptyOverdue')}
              showOverdue
              onPageChange={setPage}
            />
          </QueryBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
