import { memo } from 'react'
import type { TimelineGrid } from '../../model/timeline-grid'
import { isToday } from '../../model/timeline-grid'
import styles from './schedule-grid.module.css'

export const TimelineBackground = memo(TimelineBackgroundView)

export type TimelineBackgroundProps = {
  grid: TimelineGrid
  dayWidth: number
  now: Date
}

function TimelineBackgroundView({ grid, dayWidth, now }: TimelineBackgroundProps) {
  const showColumns = dayWidth >= 6

  return (
    <div className={styles.background} aria-hidden="true">
      {showColumns &&
        grid.days.map((day) => (
          <div
            key={day.index}
            className={styles.column}
            data-weekend={day.isWeekend ? 'true' : 'false'}
            data-first-of-month={day.isFirstOfMonth ? 'true' : 'false'}
            data-today={isToday(day.date, now) ? 'true' : 'false'}
            style={{ width: dayWidth, left: day.index * dayWidth }}
          />
        ))}

      {!showColumns &&
        grid.months.map((month) => (
          <div
            key={month.key}
            className={styles.column}
            data-first-of-month="true"
            style={{ width: month.dayCount * dayWidth, left: month.startIndex * dayWidth }}
          />
        ))}
    </div>
  )
}
