import { useQuery } from '@tanstack/react-query'
import { enUS, ru } from 'date-fns/locale'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { myScheduleQuery } from '@/entities/schedule/schedule.queries'
import { AssignedEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { emptyReason, rowsInPeriod } from '@/features/schedule/model/empty-reason'
import { ribbonWindow, windowRange } from '@/features/schedule/model/ribbon/ribbon-window'
import { useInvitationOnce } from '@/features/schedule/model/use-invitation-once'
import { periodLabel, useScheduleView } from '@/features/schedule/model/use-schedule-view'
import { useSwapDirection } from '@/features/schedule/model/use-swap-direction'
import { PhoneSchedule } from '@/features/schedule/ui/phone-agenda/phone-schedule'
import { RibbonGrid } from '@/features/schedule/ui/ribbon/ribbon-grid'
import { ScheduleEmpty } from '@/features/schedule/ui/schedule-empty/schedule-empty'
import { ViewSwap } from '@/features/schedule/ui/view-swap/view-swap'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { QueryBoundary } from '@/shared/ui/states'

const DATE_FNS_LOCALES = { ru, en: enUS }

export function MySchedulePage() {
  const { t, i18n } = useTranslation()
  const { openEventCard } = useEventOverlay()
  const view = useScheduleView()
  const ribbon = view.scale === 'all'
  const window = useMemo(() => ribbonWindow(new Date(), view.offset), [view.offset])
  const query = useQuery({
    ...myScheduleQuery(ribbon ? windowRange(window) : {}),
    placeholderData: (previous) => previous,
  })
  const phone = usePhoneViewport()
  const direction = useSwapDirection(view.scale, view.offset)

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const label = useMemo(
    () => periodLabel(view.scale, view.from, view.to, locale),
    [view.scale, view.from, view.to, locale],
  )

  const totalRows = query.data?.rows.length ?? 0
  const periodRows = useMemo(
    () => (query.data ? rowsInPeriod(query.data, view.from, view.to) : 0),
    [query.data, view.from, view.to],
  )

  const swapToken = ribbon ? view.scale : `${view.scale}:${view.offset}`

  const invitationShown = useInvitationOnce(
    totalRows === 0 && query.data !== undefined,
    `${view.scale}:${view.offset}`,
  )
  const reason = emptyReason({
    totalRows,
    periodRows,
    scale: view.scale,
    invitationShown,
  })

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
              onStep={view.scale === 'all' ? undefined : view.step}
              onPresent={view.goToday}
              atPresent={view.atPresent}
            />
            <ScheduleEmpty reason={reason}>
              <ViewSwap token={swapToken} direction={direction}>
                {view.wrapped && phone ? (
                  <PhoneSchedule
                    data={query.data}
                    from={view.from}
                    months={view.wrapped.months}
                    selectedId={view.selectedId}
                    onSelect={view.select}
                    onOpenEvent={(row) => openEventCard(row.event_id)}
                  />
                ) : view.wrapped ? (
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
                ) : ribbon ? (
                  <RibbonGrid
                    data={query.data}
                    window={window}
                    locale={locale}
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
                    onOpenEvent={(row) => openEventCard(row.event_id)}
                  />
                )}
              </ViewSwap>
            </ScheduleEmpty>
            <AssignedEventOverlay />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
