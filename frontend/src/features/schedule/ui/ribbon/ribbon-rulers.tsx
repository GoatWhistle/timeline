import { format, type Locale } from 'date-fns'
import { dayKey } from '../../model/month-grid'
import {
  RIBBON_DAY_RULE,
  RIBBON_DENSITY_TRACK,
  RIBBON_MONTH_RULE,
} from '../../model/ribbon/ribbon-layout'
import type { SeasonBand } from '../../model/ribbon/ribbon-season'
import type { TimelineGrid } from '../../model/timeline-grid'
import styles from './ribbon.module.css'

export const DAY_NUMBER_MIN_WIDTH = 22

export function RibbonSeasons({
  bands,
  dayWidth,
}: {
  bands: readonly SeasonBand[]
  dayWidth: number
}) {
  return (
    <div className={styles.seasons} aria-hidden="true">
      {bands.map((band) => (
        <div
          key={band.key}
          className={styles.season}
          data-ribbon-season={band.season}
          data-season={band.season}
          style={{ left: band.startDay * dayWidth, width: band.dayCount * dayWidth }}
        />
      ))}
    </div>
  )
}

export function RibbonMonths({
  grid,
  dayWidth,
  locale,
}: {
  grid: TimelineGrid
  dayWidth: number
  locale: Locale
}) {
  return (
    <div
      className={styles.months}
      data-ribbon-months
      style={{ ['--ribbon-month-rule' as string]: `${RIBBON_MONTH_RULE}px` }}
    >
      {grid.months.map((month) => (
        <span
          key={month.key}
          className={styles.month}
          data-ribbon-month={month.key}
          data-quarter-start={month.date.getMonth() % 3 === 0 ? 'true' : 'false'}
          style={{ left: month.startIndex * dayWidth, width: month.dayCount * dayWidth }}
        >
          {format(month.date, 'LLL', { locale })}
          {month.date.getMonth() === 0 && (
            <span className={styles.monthYear}>{month.date.getFullYear()}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function RibbonDays({
  grid,
  dayWidth,
  todayIndex,
}: {
  grid: TimelineGrid
  dayWidth: number
  todayIndex: number
}) {
  const showNumbers = dayWidth >= DAY_NUMBER_MIN_WIDTH

  return (
    <div
      className={styles.days}
      data-ribbon-days
      aria-hidden="true"
      style={{ ['--ribbon-day-rule' as string]: `${RIBBON_DAY_RULE}px` }}
    >
      {grid.days.map((day) => (
        <span
          key={dayKey(day.date)}
          className={styles.day}
          data-weekend={day.isWeekend ? 'true' : 'false'}
          data-today={day.index === todayIndex ? 'true' : 'false'}
          style={{ left: day.index * dayWidth, width: dayWidth }}
        >
          {showNumbers ? day.date.getDate() : ''}
        </span>
      ))}
    </div>
  )
}

export function RibbonDensity({
  grid,
  counts,
  peak,
  dayWidth,
  label,
}: {
  grid: TimelineGrid
  counts: readonly number[]
  peak: number
  dayWidth: number
  label: string
}) {
  return (
    <div
      className={styles.density}
      data-ribbon-density
      role="img"
      aria-label={label}
      style={{ ['--ribbon-density-track' as string]: `${RIBBON_DENSITY_TRACK}px` }}
    >
      {grid.days.map((day) => {
        const count = counts[day.index] ?? 0
        if (count === 0) return null
        return (
          <span
            key={dayKey(day.date)}
            className={styles.densityBar}
            data-ribbon-density-day={day.index}
            style={{
              left: day.index * dayWidth,
              width: Math.max(2, dayWidth - 1),
              height: peak === 0 ? 0 : (count / peak) * RIBBON_DENSITY_TRACK,
            }}
          />
        )
      })}
    </div>
  )
}
