import { useCallback } from 'react'
import { compareCivilDates, isCivilDate } from '@/shared/datetime/civil'
import type { Locale } from '@/shared/i18n/locale'
import { CalendarDayCell, type DayState } from './calendar-day'
import { dayLabel, weekdayNames } from './calendar-labels'
import {
  buildMonthGrid,
  type CalendarMonth,
  type DayBounds,
  isOutOfBounds,
  withinRange,
} from './month-grid'

export type RangeHighlight = { from: string; to: string } | null

function stateOf(
  cell: { date: string; dayOfMonth: number; outside: boolean },
  options: {
    today: string
    selected: string
    range: RangeHighlight
    bounds: DayBounds
  },
): DayState {
  const { today, selected, range, bounds } = options
  const isSelected = isCivilDate(selected) && compareCivilDates(cell.date, selected) === 0
  const rangeStart = range !== null && compareCivilDates(cell.date, range.from) === 0
  const rangeEnd = range !== null && compareCivilDates(cell.date, range.to) === 0
  return {
    date: cell.date,
    dayOfMonth: cell.dayOfMonth,
    outside: cell.outside,
    today: compareCivilDates(cell.date, today) === 0,
    selected: isSelected,
    rangeStart,
    rangeEnd,
    inRange: range !== null && withinRange(cell.date, range.from, range.to),
    disabled: isOutOfBounds(cell.date, bounds),
  }
}

export function CalendarGrid({
  month,
  focused,
  selected,
  today,
  range,
  bounds,
  locale,
  labelledBy,
  describedBy,
  autoFocus,
  onSelect,
  onKeyDown,
}: {
  month: CalendarMonth
  focused: string
  selected: string
  today: string
  range: RangeHighlight
  bounds: DayBounds
  locale: Locale
  labelledBy: string
  describedBy?: string | undefined
  autoFocus: boolean
  onSelect: (date: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const weekdays = weekdayNames(locale)
  const cells = buildMonthGrid(month)

  const focusedRef = useCallback(
    (cell: HTMLButtonElement | null) => {
      if (!autoFocus || !cell || cell === document.activeElement) return
      cell.focus({ preventScroll: true })
    },
    [autoFocus],
  )

  return (
    <table
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      className="w-max table-fixed border-separate border-spacing-1"
    >
      <thead>
        <tr>
          {weekdays.map((weekday) => (
            <th key={weekday.long} scope="col" abbr={weekday.long} className="w-9 font-normal">
              <span aria-hidden="true" className="text-caption text-muted-foreground">
                {weekday.short}
              </span>
              <span className="sr-only">{weekday.long}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[0, 1, 2, 3, 4, 5].map((week) => (
          <tr key={week}>
            {cells.slice(week * 7, week * 7 + 7).map((cell) => {
              const day = stateOf(cell, { today, selected, range, bounds })
              const isFocused = compareCivilDates(cell.date, focused) === 0
              return (
                <td key={cell.date} className="p-0">
                  <CalendarDayCell
                    day={day}
                    label={dayLabel(cell.date, locale)}
                    tabbable={isFocused}
                    buttonRef={isFocused ? focusedRef : undefined}
                    onSelect={onSelect}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
