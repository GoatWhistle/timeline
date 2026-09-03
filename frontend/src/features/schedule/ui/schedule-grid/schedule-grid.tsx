import { enUS, ru } from 'date-fns/locale'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { barSummary } from '../../model/bar-summary'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import { nearestUpcomingId } from '../../model/nearest-moment'
import { packTimeline } from '../../model/pack-lanes'
import { rowSentence } from '../../model/row-sentence'
import {
  barHeightFor,
  canvasHeight,
  fittedDayWidth,
  HEADER_HEIGHT,
  laneOffset,
  MAX_LANES,
  type ScheduleScale,
} from '../../model/schedule-scale'
import { buildTimelineGrid } from '../../model/timeline-grid'
import { useAnnouncer } from '../../model/use-announcer'
import { useElementWidth } from '../../model/use-element-width'
import { useMomentCursor } from '../../model/use-moment-cursor'
import { useTimelineCursor } from '../../model/use-timeline-cursor'
import { useTodayLine } from '../../model/use-today-line'
import { useScrollToDay, useZoomGesture } from '../../model/use-viewport-gestures'
import { EventBar } from '../event-bar/event-bar'
import styles from './schedule-grid.module.css'
import { TimelineBackground } from './timeline-background'
import { TimelineHeader } from './timeline-header'

const DATE_FNS_LOCALES = { ru, en: enUS }

export type ScheduleGridProps = {
  data: ScheduleResponse
  from: Date
  to: Date
  dayWidth: number
  scale: ScheduleScale
  now?: Date
  hrefBuilder?: (row: ScheduleRowData) => string
  onNavigate?: (href: string) => void
  onToday?: () => void
  onZoom?: (direction: 1 | -1) => void
  onDayWidth?: (next: number) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function ScheduleGrid({
  data,
  from,
  to,
  dayWidth: requestedDayWidth,
  scale,
  now = new Date(),
  hrefBuilder,
  onNavigate,
  onToday,
  onZoom,
  onDayWidth,
  onOpenEvent,
}: ScheduleGridProps) {
  const { t, i18n } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { message, announce } = useAnnouncer()
  const momentCursor = useMomentCursor(canvasRef)

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const grid = useMemo(() => buildTimelineGrid(from, to), [from, to])
  const measured = useElementWidth(viewportRef)
  const dayWidth = fittedDayWidth(requestedDayWidth, measured, grid.dayCount)
  const barHeight = barHeightFor(scale)

  useTodayLine({ target: canvasRef, grid, dayWidth })
  useZoomGesture({
    target: viewportRef,
    enabled: onDayWidth !== undefined,
    dayWidth,
    onDayWidth: onDayWidth ?? (() => undefined),
  })
  useScrollToDay({ viewport: viewportRef, grid, dayWidth, now, scale })

  const spans = useMemo(() => buildCalendarSpans(data, grid), [data, grid])
  const packing = useMemo(
    () => packTimeline(spans, grid.dayCount, MAX_LANES),
    [spans, grid.dayCount],
  )

  const ordered = useMemo(
    () =>
      [...packing.packed].sort(
        (a, b) => a.startDay - b.startDay || a.item.id.localeCompare(b.item.id),
      ),
    [packing.packed],
  )

  const navigable = useMemo(
    () =>
      ordered.map((entry) => ({ id: entry.item.id, startDay: entry.startDay, lane: entry.lane })),
    [ordered],
  )

  const sentenceContext = useMemo(
    () => ({
      t,
      formatDate: (iso: string) => formatDate(iso),
      formatRemaining: (iso: string) => formatRelative(iso, now),
      now,
    }),
    [t, now],
  )

  const sentenceOf = useCallback(
    (span: CalendarSpan) => rowSentence(span.row, span.items, sentenceContext),
    [sentenceContext],
  )

  const summaryContext = useMemo(
    () => ({ t, formatDate: (iso: string) => formatDate(iso), now }),
    [t, now],
  )

  const summaryOf = useCallback(
    (span: CalendarSpan) => barSummary(span, summaryContext),
    [summaryContext],
  )

  const indexOf = useCallback(
    (id: string) => navigable.findIndex((span) => span.id === id),
    [navigable],
  )

  const openSpan = useCallback(
    (span: CalendarSpan) => {
      if (onOpenEvent) {
        onOpenEvent(span.row)
        return
      }
      onNavigate?.(hrefBuilder?.(span.row) ?? `/events/${span.row.event_id}`)
    },
    [onOpenEvent, onNavigate, hrefBuilder],
  )

  const { setCursor, cursorId, onKeyDown } = useTimelineCursor({
    viewport: viewportRef,
    canvas: canvasRef,
    ordered,
    navigable,
    dayWidth,
    momentCursor,
    announce,
    sentenceOf,
    openSpan,
    onToday,
    onZoom,
  })

  const highlightedId = useMemo(
    () =>
      nearestUpcomingId(
        spans.flatMap((span) => span.items),
        now,
      ),
    [spans, now],
  )

  return (
    <TooltipProvider>
      <div className={styles.frame}>
        <div ref={viewportRef} className={styles.viewport} data-schedule-scroll>
          <div
            ref={canvasRef}
            className={styles.canvas}
            data-schedule-viewport
            role="application"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard entry point for the schedule widget
            tabIndex={0}
            aria-label={t('schedule.tableAria')}
            onKeyDown={onKeyDown}
            style={{
              width: grid.dayCount * dayWidth,
              height: canvasHeight(barHeight, packing.laneCount),
              ['--schedule-header-height' as string]: `${HEADER_HEIGHT}px`,
            }}
          >
            <TimelineBackground grid={grid} dayWidth={dayWidth} now={now} />
            <TimelineHeader grid={grid} dayWidth={dayWidth} locale={locale} now={now} />
            <div className={styles.todayLine} data-schedule-today-line aria-hidden="true" />

            <div className={styles.lanes}>
              {ordered.map((entry) => (
                <EventBar
                  key={entry.item.id}
                  packed={entry}
                  dayWidth={dayWidth}
                  barHeight={barHeight}
                  top={laneOffset(barHeight, entry.lane)}
                  sentence={sentenceOf(entry.item)}
                  summary={summaryOf(entry.item)}
                  focused={cursorId === entry.item.id}
                  now={now}
                  highlightedId={highlightedId}
                  onFocusItem={() => setCursor(indexOf(entry.item.id))}
                  onOpenItem={() => {
                    setCursor(indexOf(entry.item.id))
                    openSpan(entry.item)
                  }}
                  onOpenMoment={() => {
                    momentCursor.reset()
                    setCursor(indexOf(entry.item.id))
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {packing.hidden.length > 0 && (
          <p className={styles.hidden}>
            {t('schedule.moreEvents', { count: packing.hidden.length })}
          </p>
        )}
      </div>

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
