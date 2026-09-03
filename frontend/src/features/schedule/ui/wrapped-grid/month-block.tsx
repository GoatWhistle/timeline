import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { memo } from 'react'
import type { CalendarSpan } from '../../model/calendar-items'
import type { MonthBlock as MonthBlockData } from '../../model/month-grid'
import { packMonthWeek } from '../../model/month-grid'
import { DAYS_PER_WEEK } from '../../model/pack-lanes'
import { wrappedBarHeight, wrappedLaneTop, wrappedRowHeight } from '../../model/schedule-scale'
import { isToday } from '../../model/timeline-grid'
import { WrappedBar } from './wrapped-bar'
import styles from './wrapped-grid.module.css'

export const MonthBlock = memo(MonthBlockView)

export type MonthBlockProps = {
  block: MonthBlockData
  spans: readonly CalendarSpan[]
  locale: Locale
  now: Date
  barHeight: number
  maxBar?: number
  cellWidth: number
  focusedKey?: string
  selectedId?: string
  dayLabel: (date: Date, count: number) => string
  sentenceOf: (span: CalendarSpan) => string
  onFocusDay: (date: Date) => void
  onSelectSpan: (span: CalendarSpan) => void
  onOpenSpan: (span: CalendarSpan) => void
}

function MonthBlockView({
  block,
  spans,
  locale,
  now,
  barHeight,
  maxBar = barHeight,
  cellWidth,
  focusedKey,
  selectedId,
  dayLabel,
  sentenceOf,
  onFocusDay,
  onSelectSpan,
  onOpenSpan,
}: MonthBlockProps) {
  const weekdays = block.weeks[0]?.days ?? []

  return (
    <section className={styles.month} data-schedule-month={block.key}>
      <h3 className={styles.monthName}>{format(block.date, 'LLLL yyyy', { locale })}</h3>

      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day.key} className={styles.weekday} data-weekend={day.isWeekend}>
            {format(day.date, 'EEEEEE', { locale })}
          </span>
        ))}
      </div>

      {block.weeks.map((week) => {
        const row = packMonthWeek(week, spans)
        const laneHeight = wrappedBarHeight(cellWidth, barHeight, row.laneCount, maxBar)
        const rowHeight = wrappedRowHeight(cellWidth, barHeight, row.laneCount, maxBar)

        return (
          <div
            key={week.key}
            className={styles.week}
            style={{ ['--week-row-height' as string]: `${rowHeight}px` }}
          >
            <div className={styles.cells}>
              {week.days.map((day, column) => {
                if (!day.inMonth) {
                  return <span key={day.key} className={styles.blank} aria-hidden="true" />
                }

                const covering = row.bars.filter(
                  (bar) => bar.startColumn <= column && bar.startColumn + bar.columns > column,
                ).length

                return (
                  <button
                    key={day.key}
                    type="button"
                    className={styles.cell}
                    data-schedule-day={day.key}
                    data-weekend={day.isWeekend ? 'true' : 'false'}
                    data-today={isToday(day.date, now) ? 'true' : 'false'}
                    tabIndex={focusedKey === day.key ? 0 : -1}
                    aria-label={dayLabel(day.date, covering)}
                    onFocus={() => onFocusDay(day.date)}
                  >
                    <span className={styles.cellNumber} aria-hidden="true">
                      {day.date.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={styles.bars}>
              {row.bars.map((bar) => (
                <WrappedBar
                  key={`${bar.span.id}:${week.key}`}
                  bar={bar}
                  columnsPerRow={DAYS_PER_WEEK}
                  cellWidth={cellWidth}
                  barHeight={laneHeight}
                  top={wrappedLaneTop(bar.lane, laneHeight, barHeight)}
                  sentence={sentenceOf(bar.span)}
                  focused={false}
                  selected={selectedId === bar.span.id}
                  onFocusItem={() => onSelectSpan(bar.span)}
                  onSelect={() => onSelectSpan(bar.span)}
                  onOpen={() => onOpenSpan(bar.span)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
