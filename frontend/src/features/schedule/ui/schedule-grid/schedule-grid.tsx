import { format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { type KeyboardEvent, type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { barSummary } from '../../model/bar-summary'
import { buildCalendarGrid } from '../../model/calendar-grid'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import { clampIndex, resolveKey } from '../../model/grid-navigation'
import { nearestUpcomingId } from '../../model/nearest-moment'
import { DAYS_PER_WEEK, packWeeks } from '../../model/pack-lanes'
import { rowSentence } from '../../model/row-sentence'
import { MAX_LANES, type ScheduleScale } from '../../model/schedule-scale'
import { useAnnouncer } from '../../model/use-announcer'
import { markElement, useMomentCursor } from '../../model/use-moment-cursor'
import { useTodayLine } from '../../model/use-today-line'
import type { Range } from '../../model/zoom-range'
import { CalendarWeek } from './calendar-week'
import styles from './schedule-grid.module.css'

const DATE_FNS_LOCALES = { ru, en: enUS }
const EXPANDED_LANES = 99

function weekOfSpan(span: CalendarSpan | undefined, weekCount: number): number {
  if (!span) return 0
  const week = Math.floor(Math.max(0, span.startDay) / DAYS_PER_WEEK)
  return Math.min(week, Math.max(0, weekCount - 1))
}

export type ScheduleGridProps = {
  data: ScheduleResponse
  range: Range
  scale: ScheduleScale
  now?: Date
  hrefBuilder?: (row: ScheduleRowData) => string
  onNavigate?: (href: string) => void
  onToday?: () => void
  onZoom?: (direction: 1 | -1) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function ScheduleGrid({
  data,
  range,
  scale,
  now = new Date(),
  hrefBuilder,
  onNavigate,
  onToday,
  onZoom,
  onOpenEvent,
}: ScheduleGridProps) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLTableElement>(null)
  const [cursor, setCursor] = useState(0)
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set())
  const { message, announce } = useAnnouncer()
  const momentCursor = useMomentCursor(canvasRef)

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const grid = useMemo(
    () => buildCalendarGrid(new Date(range.from), new Date(range.to)),
    [range.from, range.to],
  )
  useTodayLine({ target: canvasRef, scale, grid })

  const spans = useMemo(() => buildCalendarSpans(data, grid), [data, grid])

  const packedDefault = useMemo(
    () => packWeeks(spans, grid.weekCount, MAX_LANES[scale]),
    [spans, grid.weekCount, scale],
  )
  const packedExpanded = useMemo(
    () => packWeeks(spans, grid.weekCount, EXPANDED_LANES),
    [spans, grid.weekCount],
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

  const openSpan = useCallback(
    (span: CalendarSpan) => {
      setCursor(spans.findIndex((candidate) => candidate.id === span.id))
      if (onOpenEvent) {
        onOpenEvent(span.row)
        return
      }
      onNavigate?.(hrefBuilder?.(span.row) ?? `/events/${span.row.event_id}`)
    },
    [spans, onOpenEvent, onNavigate, hrefBuilder],
  )

  const highlightedId = useMemo(
    () =>
      nearestUpcomingId(
        spans.flatMap((span) => span.items),
        now,
      ),
    [spans, now],
  )

  const dayLabel = useCallback((date: Date) => format(date, 'd', { locale }), [locale])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      const action = resolveKey(event.key, spans, cursor)
      if (!action) return
      event.preventDefault()

      if (action.type === 'today') {
        onToday?.()
        return
      }
      if (action.type === 'zoomIn' || action.type === 'zoomOut') {
        onZoom?.(action.type === 'zoomIn' ? 1 : -1)
        return
      }
      if (action.type === 'open') {
        const span = spans[clampIndex(spans, cursor)]
        if (span) openSpan(span)
        return
      }
      if (action.type === 'moment') {
        const span = spans[clampIndex(spans, cursor)]
        const momentId = momentCursor.step(span, action.delta)
        announce(momentId ? (markLabel(canvasRef, momentId) ?? '') : '')
        return
      }
      if (action.type === 'openMoment') {
        momentCursor.activate(spans[clampIndex(spans, cursor)])
        return
      }

      momentCursor.reset()
      setCursor(action.index)
      const span = spans[action.index]
      announce(span ? sentenceOf(span) : '')

      const week = weekOfSpan(span, grid.weekCount)
      const target = canvasRef.current?.querySelector(`[data-schedule-week="${week}"]`)
      if (target instanceof HTMLElement) target.focus()
    },
    [spans, cursor, openSpan, onToday, onZoom, announce, sentenceOf, momentCursor, grid.weekCount],
  )

  const cursorSpan = spans[clampIndex(spans, cursor)]
  const cursorWeek = weekOfSpan(cursorSpan, grid.weekCount)

  const toggleOverflow = useCallback((week: number) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (!next.delete(week)) next.add(week)
      return next
    })
  }, [])

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-surface border">
        <div className={styles.weekdays} aria-hidden="true">
          {(grid.weeks[0]?.days ?? []).map((day) => (
            <span key={day.index} className={styles.weekday}>
              {format(day.date, 'EEEEEE', { locale })}
            </span>
          ))}
        </div>

        <table ref={canvasRef} aria-label={t('schedule.tableAria')} className={styles.canvas}>
          <tbody className={styles.body}>
            {grid.weeks.map((week) => (
              <CalendarWeek
                key={week.index}
                week={week}
                packing={
                  (expanded.has(week.index) ? packedExpanded : packedDefault).weeks[week.index] ?? {
                    segments: [],
                    laneCount: 0,
                    hidden: 0,
                  }
                }
                scale={scale}
                now={now}
                focusedId={cursorSpan?.id}
                isCursorWeek={cursorWeek === week.index}
                highlightedId={highlightedId}
                dayLabel={dayLabel}
                sentenceOf={sentenceOf}
                summaryOf={summaryOf}
                onToggleOverflow={() => toggleOverflow(week.index)}
                onOpenSpan={openSpan}
                onOpenMoment={(span) => {
                  momentCursor.reset()
                  setCursor(spans.findIndex((c) => c.id === span.id))
                }}
                onKeyDown={onKeyDown}
                onFocusWeek={() => undefined}
                onFocusSpan={(id) => setCursor(spans.findIndex((span) => span.id === id))}
              />
            ))}
          </tbody>
        </table>
      </div>
      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}

function markLabel(canvas: RefObject<HTMLElement | null>, momentId: string): string | undefined {
  return markElement(canvas, momentId)?.getAttribute('aria-label') ?? undefined
}
