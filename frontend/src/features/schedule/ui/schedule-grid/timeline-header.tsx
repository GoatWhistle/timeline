import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { memo } from 'react'
import type { TimelineGrid } from '../../model/timeline-grid'
import { isToday } from '../../model/timeline-grid'
import styles from './schedule-grid.module.css'

export const TimelineHeader = memo(TimelineHeaderView)

export type TimelineHeaderProps = {
  grid: TimelineGrid
  dayWidth: number
  locale: Locale
  now: Date
}

function TimelineHeaderView({ grid, dayWidth, locale, now }: TimelineHeaderProps) {
  const showDays = dayWidth >= 18
  const showWeekday = dayWidth >= 34

  return (
    <div className={styles.header} aria-hidden="true">
      <div className={styles.months}>
        {grid.months.map((month) => (
          <div
            key={month.key}
            className={styles.month}
            style={{ width: month.dayCount * dayWidth, left: month.startIndex * dayWidth }}
          >
            <span className={styles.monthLabel}>
              {format(month.date, dayWidth >= 8 ? 'LLLL yyyy' : 'LLL', { locale })}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.days}>
        {showDays &&
          grid.days.map((day) => (
            <div
              key={day.index}
              className={styles.day}
              data-weekend={day.isWeekend ? 'true' : 'false'}
              data-today={isToday(day.date, now) ? 'true' : 'false'}
              style={{ width: dayWidth, left: day.index * dayWidth }}
            >
              <span className={styles.dayNumber}>{format(day.date, 'd', { locale })}</span>
              {showWeekday && (
                <span className={styles.dayWeekday}>{format(day.date, 'EEEEEE', { locale })}</span>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
