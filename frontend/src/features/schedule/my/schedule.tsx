import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import { useScheduleView } from '@/features/schedule/model/use-schedule-view'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { ScheduleFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'

export function MySchedulePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const query = useQuery(myScheduleQuery({}))
  const view = useScheduleView(query.data?.range)

  return (
    <div>
      <PageHeader title={t('schedule.myTitle')} />

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
          <EmptyState
            title={t('schedule.myEmpty')}
            figure={ScheduleFigure}
            action={
              <Button asChild variant="outline">
                <Link to="/catalog">{t('action.browseCatalog')}</Link>
              </Button>
            }
          />
        ) : (
          query.data && (
            <div className="flex flex-col gap-4">
              <ScheduleGrid
                data={query.data}
                range={view.range}
                scale={view.scale}
                onToday={view.goToday}
                onZoom={view.zoom}
                onNavigate={(href) => navigate(href)}
              />
              <ViewTabs value={view.scale} onChange={view.setScale} onToday={view.goToday} />
              <ScheduleLegend />
            </div>
          )
        )}
      </QueryBoundary>
    </div>
  )
}
