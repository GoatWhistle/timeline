import { addDays, format, startOfMonth } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import { buildMonthBlocks, dayKey } from '../../model/month-grid'
import { DAYS_PER_WEEK } from '../../model/pack-lanes'
import { rowSentence } from '../../model/row-sentence'
import { GRID_GAP, GRID_PADDING } from '../../model/schedule-scale'
import { buildTimelineGrid } from '../../model/timeline-grid'
import { useAnnouncer } from '../../model/use-announcer'
import { useElementWidth } from '../../model/use-element-width'
import { MonthBlock } from './month-block'
import styles from './wrapped-grid.module.css'

const DATE_FNS_LOCALES = { ru, en: enUS }

export type WrappedGridProps = {
  data: ScheduleResponse
  from: Date
  months: number
  columns: number
  minCell: number
  barHeight: number
  now?: Date
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function WrappedGrid({
  data,
  from,
  months,
  columns,
  minCell,
  barHeight,
  now = new Date(),
  onOpenEvent,
}: WrappedGridProps) {
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const { message, announce } = useAnnouncer()

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const blocks = useMemo(() => buildMonthBlocks(from, months), [from, months])

  const bounds = useMemo(() => {
    const first = blocks[0]?.weeks[0]?.days[0]?.date ?? startOfMonth(from)
    const weeks = blocks[blocks.length - 1]?.weeks
    const last = weeks?.[weeks.length - 1]?.days[DAYS_PER_WEEK - 1]?.date ?? first
    return { first, last }
  }, [blocks, from])

  const spans = useMemo(
    () => buildCalendarSpans(data, buildTimelineGrid(bounds.first, bounds.last)),
    [data, bounds],
  )

  const width = useElementWidth(containerRef)
  const available = width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)
  const measured = available / (columns * DAYS_PER_WEEK)
  const cellWidth = Math.max(minCell, measured)

  const sentenceOf = useCallback(
    (span: CalendarSpan) =>
      rowSentence(span.row, span.items, {
        t,
        formatDate: (iso: string) => formatDate(iso),
        formatRemaining: (iso: string) => formatRelative(iso, now),
        now,
      }),
    [t, now],
  )

  const dayLabel = useCallback(
    (date: Date, count: number) =>
      t('schedule.dayAria', { date: format(date, 'd LLLL yyyy', { locale }), count }),
    [t, locale],
  )

  const [cursor, setCursor] = useState<Date>(() =>
    now >= bounds.first && now <= bounds.last ? now : bounds.first,
  )

  const focusDay = useCallback((date: Date) => {
    setCursor(date)
    const target = containerRef.current?.querySelector(`[data-schedule-day="${dayKey(date)}"]`)
    if (target instanceof HTMLElement) target.focus()
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: DAYS_PER_WEEK,
        ArrowUp: -DAYS_PER_WEEK,
      }

      if (event.key in moves) {
        event.preventDefault()
        const next = addDays(cursor, moves[event.key] ?? 0)
        if (next >= bounds.first && next <= bounds.last) focusDay(next)
        return
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        focusDay(event.key === 'Home' ? bounds.first : bounds.last)
        return
      }

      if (event.key === 't' || event.key === 'T') {
        event.preventDefault()
        if (now >= bounds.first && now <= bounds.last) focusDay(now)
      }
    },
    [cursor, bounds, focusDay, now],
  )

  const cursorKey = dayKey(cursor)
  const known = blocks.some((block) =>
    block.weeks.some((week) => week.days.some((day) => day.key === cursorKey)),
  )
  const fallbackKey = blocks[0]?.weeks[0]?.days[0]?.key

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={styles.grid}
        data-schedule-wrapped
        role="application"
        style={{
          ['--schedule-columns' as string]: `${columns}`,
          ['--schedule-cell' as string]: `${cellWidth}px`,
        }}
        aria-label={t('schedule.tableAria')}
        onKeyDown={onKeyDown}
      >
        {blocks.map((block) => (
          <MonthBlock
            key={block.key}
            block={block}
            spans={spans}
            locale={locale}
            now={now}
            barHeight={barHeight}
            cellWidth={cellWidth}
            focusedKey={known ? cursorKey : fallbackKey}
            dayLabel={dayLabel}
            sentenceOf={sentenceOf}
            onFocusDay={setCursor}
            onOpenSpan={(span) => {
              announce(sentenceOf(span))
              onOpenEvent?.(span.row)
            }}
          />
        ))}
      </div>

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
