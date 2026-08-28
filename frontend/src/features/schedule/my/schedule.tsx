import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import type { ScheduleScale } from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { ZoomSwitch } from '@/features/schedule/zoom-switch/zoom-switch'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { QueryBoundary } from '@/shared/ui/states'

const DEFAULTS = { scale: 'month' as string }

export function MySchedulePage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const scale: ScheduleScale = filters.scale === 'week' ? 'week' : 'month'
  const query = useQuery(myScheduleQuery({}))

  return (
    <div>
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.myDescription')}
        actions={<ZoomSwitch value={scale} onChange={(next) => setFilters({ scale: next })} />}
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
        {query.data && query.data.rows.length === 0 ? (
          <EmptyState title={t('schedule.myEmpty')} />
        ) : (
          query.data && (
            <div className="flex flex-col gap-4">
              <ScheduleGrid data={query.data} scale={scale} />
              <ScheduleLegend />
            </div>
          )
        )}
      </QueryBoundary>
    </div>
  )
}
