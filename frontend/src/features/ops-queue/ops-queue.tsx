import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { overdueSeconds, type QueueScope, queueQuery, splitOverdue } from '@/entities/ops'
import { formatDateTime } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { QueueFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { ChannelsCell, KindCell, ReasonCell, TypeCell } from './queue-row-cells'
import { ScopeTabs } from './scope-tabs'

const DEFAULTS = { scope: 'failures' }

function OverdueCell({ seconds }: { seconds: number | null }) {
  const { t } = useTranslation()
  if (seconds === null) return <span className="text-muted-foreground">—</span>

  const parts = splitOverdue(seconds)
  const chunks: string[] = []
  if (parts.days) chunks.push(t('countdown.days', { count: parts.days }))
  if (parts.hours) chunks.push(t('countdown.hours', { count: parts.hours }))
  if (parts.minutes) chunks.push(t('countdown.minutes', { count: parts.minutes }))
  if (!chunks.length) chunks.push(t('countdown.seconds', { count: parts.seconds }))

  return <span className="whitespace-nowrap tabular-nums text-copy">{chunks.join(' ')}</span>
}

export function AdminOpsQueuePage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()

  const scope: QueueScope = filters.scope === 'stuck-leases' ? 'stuck-leases' : 'failures'
  const stuck = scope === 'stuck-leases'
  const query = useQuery(queueQuery({ scope, page }))
  const items = query.data?.items ?? []

  return (
    <div>
      <PageHeader title={t('ops:title')} description={t('ops:description')} />

      <p className="mb-4 flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('ops:readOnly')}
      </p>

      <ScopeTabs value={scope} onChange={(next) => setFilters({ scope: next })} />

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={8} columns={stuck ? 5 : 6} density="text" />}
      >
        {items.length === 0 ? (
          <EmptyState
            title={t(stuck ? 'ops:emptyStuckTitle' : 'ops:emptyFailuresTitle')}
            description={t(stuck ? 'ops:emptyStuckHint' : 'ops:emptyFailuresHint')}
            figure={QueueFigure}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{t('ops:column.kind')}</TableHead>
                <TableHead className="w-40">{t('ops:column.type')}</TableHead>
                <TableHead className="w-44">{t('ops:column.scheduled')}</TableHead>
                {stuck ? (
                  <TableHead className="w-36">{t('ops:column.overdue')}</TableHead>
                ) : (
                  <>
                    <TableHead className="w-24">{t('ops:column.attempts')}</TableHead>
                    <TableHead className="w-52">{t('ops:column.channels')}</TableHead>
                  </>
                )}
                <TableHead>{t(stuck ? 'ops:column.updated' : 'ops:column.reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <KindCell entry={entry} />
                  </TableCell>
                  <TableCell>
                    <TypeCell entry={entry} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDateTime(entry.scheduled_at)}
                  </TableCell>
                  {stuck ? (
                    <TableCell>
                      <OverdueCell seconds={overdueSeconds(entry)} />
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="tabular-nums">
                        {t('ops:attempts', { count: entry.attempt_count ?? 0 })}
                      </TableCell>
                      <TableCell>
                        <ChannelsCell entry={entry} />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="max-w-0">
                    {stuck ? (
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatDateTime(entry.updated_at)}
                      </span>
                    ) : (
                      <ReasonCell entry={entry} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>

      <Pagination meta={query.data?.meta} onPageChange={setPage} />
    </div>
  )
}
