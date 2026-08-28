import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import { useScheduleView } from '@/features/schedule/model/use-schedule-view'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { ZoomSwitch } from '@/features/schedule/zoom-switch/zoom-switch'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { QueryBoundary } from '@/shared/ui/states'

export function MySchedulePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const query = useQuery(myScheduleQuery({}))
  const view = useScheduleView(query.data?.range)

  return (
    <div>
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.myDescription')}
        actions={<ZoomSwitch value={view.scale} onChange={view.setScale} onToday={view.goToday} />}
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
              <ScheduleGrid
                data={query.data}
                range={view.range}
                scale={view.scale}
                viewportWidth={view.viewportWidth}
                onToday={view.goToday}
                onZoom={view.zoom}
                onNavigate={(href) => navigate(href)}
              />
              <ScheduleLegend />
            </div>
          )
        )}
      </QueryBoundary>
    </div>
  )
}
