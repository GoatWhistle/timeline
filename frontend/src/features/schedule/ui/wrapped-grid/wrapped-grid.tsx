import { format, startOfMonth } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { useCallback, useMemo, useRef } from 'react'
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
import { useWrappedFocus } from '../../model/use-wrapped-focus'
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
  maxBar?: number
  selectedId?: string
  now?: Date
  onSelect?: (id: string | undefined) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function WrappedGrid({
  data,
  from,
  months,
  columns,
  minCell,
  barHeight,
  maxBar = barHeight,
  selectedId,
  now = new Date(),
  onSelect,
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
    (date: Date, count: number) => {
      const named = t('schedule.dayAria', {
        date: format(date, 'd LLLL yyyy', { locale }),
        count,
      })
      return count > 0 ? `${named}. ${t('schedule.dayBarsHint')}` : named
    },
    [t, locale],
  )

  const spanById = useCallback((id: string) => spans.find((span) => span.id === id), [spans])

  const openById = useCallback(
    (id: string) => {
      const span = spanById(id)
      if (!span) return
      announce(sentenceOf(span))
      onOpenEvent?.(span.row)
    },
    [spanById, announce, sentenceOf, onOpenEvent],
  )

  const { cursor, setCursor, onDayKeyDown, onBarKeyDown } = useWrappedFocus({
    container: containerRef,
    first: bounds.first,
    last: bounds.last,
    now,
    onClear: () => onSelect?.(undefined),
    onSelect: (id) => onSelect?.(id),
    onOpen: openById,
  })

  const cursorKey = dayKey(cursor)
  const known = blocks.some((block) =>
    block.weeks.some((week) => week.days.some((day) => day.inMonth && day.key === cursorKey)),
  )
  const fallbackKey = blocks
    .flatMap((block) => block.weeks)
    .flatMap((week) => week.days)
    .find((day) => day.inMonth)?.key

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={styles.grid}
        data-schedule-wrapped
        data-has-selection={selectedId ? 'true' : 'false'}
        role="application"
        style={{
          ['--schedule-columns' as string]: `${columns}`,
          ['--schedule-cell' as string]: `${cellWidth}px`,
        }}
        aria-label={t('schedule.tableAria')}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onSelect?.(undefined)
        }}
      >
        {blocks.map((block) => (
          <MonthBlock
            key={block.key}
            block={block}
            spans={spans}
            locale={locale}
            now={now}
            barHeight={barHeight}
            maxBar={maxBar}
            cellWidth={cellWidth}
            focusedKey={known ? cursorKey : fallbackKey}
            selectedId={selectedId}
            dayLabel={dayLabel}
            sentenceOf={sentenceOf}
            onFocusDay={setCursor}
            onDayKeyDown={onDayKeyDown}
            onBarKeyDown={onBarKeyDown}
            onClearSelection={() => onSelect?.(undefined)}
            onFocusSpan={(span) => onSelect?.(span.id)}
            onSelectSpan={(span) => onSelect?.(selectedId === span.id ? undefined : span.id)}
            onOpenSpan={(span) => openById(span.id)}
          />
        ))}
      </div>

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
