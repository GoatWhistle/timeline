import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { type KeyboardEvent, memo, useRef } from 'react'
import { eventColorAttrs } from '@/entities/event/event-color'
import type { CalendarSpan } from '../../model/calendar-items'
import type { MonthBlock as MonthBlockData } from '../../model/month-grid'
import { AGENDA_MAX_DOTS, spansOfDay } from '../../model/phone-agenda'
import { phoneDayCell } from '../../model/phone-scale'
import { isToday } from '../../model/timeline-grid'
import { useElementWidth } from '../../model/use-element-width'
import styles from './phone-month.module.css'
import { useRoomBelow } from './use-room-below'

export const PhoneMonth = memo(PhoneMonthView)

export type PhoneMonthProps = {
  block: MonthBlockData
  spans: readonly CalendarSpan[]
  locale: Locale
  now: Date
  selectedKey?: string
  focusedKey?: string
  dayLabel: (date: Date, count: number) => string
  onPickDay: (date: Date) => void
  onFocusDay: (date: Date) => void
  onDayKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

function PhoneMonthView({
  block,
  spans,
  locale,
  now,
  selectedKey,
  focusedKey,
  dayLabel,
  onPickDay,
  onFocusDay,
  onDayKeyDown,
}: PhoneMonthProps) {
  const weekdays = block.weeks[0]?.days ?? []
  const monthRef = useRef<HTMLElement>(null)
  const width = useElementWidth(monthRef)
  const room = useRoomBelow(monthRef)
  const cell = phoneDayCell(width, room, block.weeks.length)

  return (
    <section
      ref={monthRef}
      className={styles.month}
      data-schedule-month={block.key}
      data-schedule-phone-cell={cell}
      style={{ ['--phone-day-cell' as string]: `${cell}px` }}
    >
      <h3 className={styles.name}>{format(block.date, 'LLLL yyyy', { locale })}</h3>

      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day.key} className={styles.weekday} data-weekend={day.isWeekend}>
            {format(day.date, 'EEEEEE', { locale })}
          </span>
        ))}
      </div>

      <div className={styles.weeks}>
        {block.weeks.flatMap((week) =>
          week.days.map((day) => {
            if (!day.inMonth) {
              return <span key={day.key} className={styles.blank} aria-hidden="true" />
            }

            const covering = spansOfDay(spans, day.date)
            const dots = covering.slice(0, AGENDA_MAX_DOTS)

            return (
              <button
                key={day.key}
                type="button"
                className={styles.cell}
                data-schedule-day={day.key}
                data-weekend={day.isWeekend ? 'true' : 'false'}
                data-today={isToday(day.date, now) ? 'true' : 'false'}
                data-selected={selectedKey === day.key ? 'true' : 'false'}
                data-schedule-day-bars={covering.length}
                aria-pressed={selectedKey === day.key}
                tabIndex={focusedKey === day.key ? 0 : -1}
                aria-label={dayLabel(day.date, covering.length)}
                onFocus={() => onFocusDay(day.date)}
                onKeyDown={onDayKeyDown}
                onClick={() => onPickDay(day.date)}
              >
                <span className={styles.number} aria-hidden="true">
                  {day.date.getDate()}
                </span>
                <span className={styles.dots} aria-hidden="true">
                  {dots.map((span) => (
                    <span
                      key={span.id}
                      {...eventColorAttrs(span.row.color ?? null)}
                      className={styles.dot}
                    />
                  ))}
                  {covering.length > AGENDA_MAX_DOTS && <span className={styles.more}>+</span>}
                </span>
              </button>
            )
          }),
        )}
      </div>
    </section>
  )
}
