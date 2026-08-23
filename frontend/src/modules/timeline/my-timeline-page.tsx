import { useQuery } from '@tanstack/react-query'
import { useUrlFilters } from '@/shared/lib/use-url-filters'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { myTimelineQuery } from './api'
import { ScaleSwitch } from './scale-switch'
import { Timeline, TimelineLegend, type TimelineScale } from './timeline'

const DEFAULTS = { scale: 'month' as string }

export function MyTimelinePage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const scale: TimelineScale = filters.scale === 'week' ? 'week' : 'month'
  const query = useQuery(myTimelineQuery({}))

  return (
    <div>
      <PageHeader
        title="Временная шкала"
        description="Назначенные опубликованные хакатоны"
        actions={<ScaleSwitch value={scale} onChange={(next) => setFilters({ scale: next })} />}
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.rows.length === 0 && (
        <EmptyState title="У вас пока нет назначенных хакатонов" />
      )}

      {query.data && query.data.rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <Timeline data={query.data} scale={scale} />
          <TimelineLegend />
        </div>
      )}
    </div>
  )
}
