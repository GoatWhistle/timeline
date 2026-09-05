import { addDays, type Locale } from 'date-fns'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import {
  minuteOffset,
  placeTimed,
  RIBBON_DAY_RULE,
  RIBBON_MONTH_RULE,
  ribbonDayWidth,
  splitRibbonTiers,
} from '../../model/ribbon/ribbon-layout'
import { bandAtDay, seasonBands } from '../../model/ribbon/ribbon-season'
import { dayIndexIn, MINUTES_PER_DAY, type RibbonWindow } from '../../model/ribbon/ribbon-window'
import { useRibbonDrag } from '../../model/ribbon/use-ribbon-drag'
import { useRibbonScroll } from '../../model/ribbon/use-ribbon-scroll'
import { rowSentence } from '../../model/row-sentence'
import { buildTimelineGrid } from '../../model/timeline-grid'
import { useAnnouncer } from '../../model/use-announcer'
import { useElementWidth } from '../../model/use-element-width'
import styles from './ribbon.module.css'
import { RibbonBand } from './ribbon-band'
import { RibbonControls } from './ribbon-controls'
import { RibbonHours } from './ribbon-hours'
import { RibbonDays, RibbonMonths, RibbonSeasons } from './ribbon-rulers'

export type RibbonGridProps = {
  data: ScheduleResponse
  window: RibbonWindow
  locale: Locale
  now?: Date
  onSelect?: (id: string | undefined) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function RibbonGrid({
  data,
  window,
  locale,
  now = new Date(),
  onSelect,
  onOpenEvent,
}: RibbonGridProps) {
  const { t } = useTranslation()
  const paneId = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const centred = useRef(false)
  const { message, announce } = useAnnouncer()
  const viewportWidth = useElementWidth(viewportRef)
  const dayWidth = useMemo(() => ribbonDayWidth(viewportWidth), [viewportWidth])

  const grid = useMemo(
    () => buildTimelineGrid(window.start, addDays(window.start, window.dayCount - 1)),
    [window],
  )

  const spans = useMemo(() => buildCalendarSpans(data, grid), [data, grid])
  const tiers = useMemo(() => splitRibbonTiers(spans), [spans])
  const placements = useMemo(
    () => placeTimed(tiers.timed, window.start, grid.dayCount),
    [tiers.timed, window.start, grid.dayCount],
  )

  const seasons = useMemo(
    () => seasonBands(window.start, grid.dayCount),
    [window.start, grid.dayCount],
  )

  const todayIndex = dayIndexIn(window, now)
  const width = grid.dayCount * dayWidth

  const sentenceOf = useMemo(() => {
    const context = {
      t,
      formatDate: (iso: string) => formatDate(iso),
      formatRemaining: (iso: string) => formatRelative(iso, now),
      now,
    }
    return (span: CalendarSpan) => rowSentence(span.row, span.items, context)
  }, [t, now])

  const centreOnToday = useCallback(
    (smooth: boolean) => {
      const element = viewportRef.current
      if (!element || todayIndex < 0) return
      const left = Math.max(0, todayIndex * dayWidth - element.clientWidth / 2)
      if (typeof element.scrollTo !== 'function') {
        element.scrollLeft = left
        return
      }
      element.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
    },
    [todayIndex, dayWidth],
  )

  const { scrollLeft } = useRibbonScroll(viewportRef)
  const dragging = useRibbonDrag(viewportRef)

  const centreDay = Math.round((scrollLeft + viewportWidth / 2) / dayWidth)
  const currentSeason = useMemo(() => bandAtDay(seasons, centreDay), [seasons, centreDay])

  useEffect(() => {
    if (centred.current) return
    centred.current = true
    centreOnToday(false)
  }, [centreOnToday])

  const open = (span: CalendarSpan) => {
    announce(sentenceOf(span))
    onOpenEvent?.(span.row)
  }

  return (
    <TooltipProvider>
      <div className={styles.frame} data-schedule-ribbon>
        <RibbonControls season={currentSeason} />

        <div
          className={styles.viewport}
          data-ribbon-viewport
          data-ribbon-dragging={dragging ? 'true' : undefined}
          id={paneId}
          ref={viewportRef}
          style={{
            ['--ribbon-month-rule' as string]: `${RIBBON_MONTH_RULE}px`,
            ['--ribbon-day-rule' as string]: `${RIBBON_DAY_RULE}px`,
          }}
        >
          <div className={styles.canvas} style={{ ['--ribbon-width' as string]: `${width}px` }}>
            <RibbonSeasons bands={seasons} dayWidth={dayWidth} />

            <RibbonMonths grid={grid} dayWidth={dayWidth} locale={locale} />
            <RibbonDays grid={grid} dayWidth={dayWidth} todayIndex={todayIndex} />

            <RibbonBand
              spans={tiers.band}
              start={window.start}
              dayCount={grid.dayCount}
              dayWidth={dayWidth}
              sentenceOf={sentenceOf}
              onSelect={onSelect}
              onOpen={open}
            />

            <RibbonHours
              placements={placements}
              dayWidth={dayWidth}
              label={t('schedule.hours')}
              sentenceOf={sentenceOf}
              onSelect={onSelect}
              onOpen={open}
            />

            {todayIndex >= 0 && todayIndex < grid.dayCount && (
              <span
                className={styles.nowLine}
                data-ribbon-now
                aria-hidden="true"
                style={{
                  left: minuteOffset(
                    todayIndex,
                    (now.getHours() * 60 + now.getMinutes()) % MINUTES_PER_DAY,
                    dayWidth,
                  ),
                }}
              />
            )}
          </div>
        </div>
      </div>

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
