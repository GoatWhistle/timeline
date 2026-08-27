import { useQuery } from '@tanstack/react-query'
import { myTimelineQuery } from '@/entities/schedule/schedule.queries'
import type { TimelineScale } from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { ZoomSwitch } from '@/features/schedule/zoom-switch/zoom-switch'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { PageHeader } from '@/shared/ui/layout/page-header'

const DEFAULTS = { scale: 'month' as string }

export function MySchedulePage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const scale: TimelineScale = filters.scale === 'week' ? 'week' : 'month'
  const query = useQuery(myTimelineQuery({}))

  return (
    <div>
      <PageHeader
        title="Временная шкала"
        description="Назначенные опубликованные события"
        actions={<ZoomSwitch value={scale} onChange={(next) => setFilters({ scale: next })} />}
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.rows.length === 0 && (
        <EmptyState title="У вас пока нет назначенных событий" />
      )}

      {query.data && query.data.rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <ScheduleGrid data={query.data} scale={scale} />
          <ScheduleLegend />
        </div>
      )}
    </div>
  )
}
