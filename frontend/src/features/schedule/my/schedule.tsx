import { useQuery } from '@tanstack/react-query'
import { enUS, ru } from 'date-fns/locale'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import { AssignedEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { periodLabel, useScheduleView } from '@/features/schedule/model/use-schedule-view'
import { ScheduleEmptyOverlay } from '@/features/schedule/ui/schedule-empty/schedule-empty'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary } from '@/shared/ui/states'

const DATE_FNS_LOCALES = { ru, en: enUS }

export function MySchedulePage() {
  const { t, i18n } = useTranslation()
  const { openEventCard } = useEventOverlay()
  const query = useQuery(myScheduleQuery({}))
  const view = useScheduleView()

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const label = useMemo(
    () => periodLabel(view.scale, view.from, view.to, locale),
    [view.scale, view.from, view.to, locale],
  )

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
              period={label}
              onStep={view.step}
              onPresent={view.goToday}
              atPresent={view.atPresent}
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
                  maxBar={view.wrapped.maxBar}
                  selectedId={view.selectedId}
                  onSelect={view.select}
                  onOpenEvent={(row) => openEventCard(row.event_id)}
                />
              ) : (
                <WeekGrid
                  data={query.data}
                  from={view.from}
                  to={view.to}
                  locale={locale}
                  selectedId={view.selectedId}
                  onSelect={view.select}
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
