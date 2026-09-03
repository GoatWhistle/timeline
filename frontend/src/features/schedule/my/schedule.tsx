import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import { AssignedEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { useScheduleView } from '@/features/schedule/model/use-schedule-view'
import { ScheduleEmptyOverlay } from '@/features/schedule/ui/schedule-empty/schedule-empty'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'

export function MySchedulePage() {
  const { t } = useTranslation()
  const { openEventCard } = useEventOverlay()
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
        {query.data && (
          <div className="flex flex-col gap-4">
            <ViewTabs
              value={view.scale}
              onChange={view.setScale}
              onZoom={view.zoom}
              dayWidth={view.dayWidth}
              canZoom={view.canZoom}
            />
            <ScheduleEmptyOverlay
              empty={query.data.rows.length === 0}
              title={t('schedule.myEmpty')}
              description={t('schedule.myEmptyHint')}
              action={
                <Button asChild variant="outline">
                  <Link to="/catalog">{t('action.browseCatalog')}</Link>
                </Button>
              }
            >
              {view.wrapped ? (
                <WrappedGrid
                  data={query.data}
                  from={view.from}
                  months={view.wrapped.months}
                  columns={view.wrapped.columns}
                  minCell={view.wrapped.minCell}
                  barHeight={view.wrapped.barHeight}
                  onOpenEvent={(row) => openEventCard(row.event_id)}
                />
              ) : (
                <ScheduleGrid
                  data={query.data}
                  from={view.from}
                  to={view.to}
                  dayWidth={view.dayWidth}
                  scale={view.scale}
                  onToday={view.goToday}
                  onZoom={view.zoom}
                  onDayWidth={view.canZoom ? view.setDayWidth : undefined}
                  onOpenEvent={(row) => openEventCard(row.event_id)}
                />
              )}
            </ScheduleEmptyOverlay>
            <AssignedEventOverlay />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
