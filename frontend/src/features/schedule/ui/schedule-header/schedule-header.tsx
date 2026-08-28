import { useTranslation } from 'react-i18next'
import styles from '../schedule-grid/schedule-grid.module.css'

export type ScheduleHeaderProps = {
  ticks: readonly Date[]
  x: (date: Date) => number
  tickLabel: (date: Date) => string
  labelWidth: number
  canvasWidth: number
}

export function ScheduleHeader({
  ticks,
  x,
  tickLabel,
  labelWidth,
  canvasWidth,
}: ScheduleHeaderProps) {
  const { t } = useTranslation()

  return (
    <thead className="sticky top-0 z-30 block bg-card">
      <tr
        className="grid border-b"
        style={{ gridTemplateColumns: `${labelWidth}px ${canvasWidth}px` }}
      >
        <th
          scope="col"
          className="sticky left-0 z-40 border-r bg-card px-3 py-2 text-start font-medium text-caption text-muted-foreground uppercase"
        >
          {t('schedule.columnEvent')}
        </th>
        <th scope="col" className="relative h-9 font-normal">
          {ticks.map((tick) => (
            <span
              key={tick.toISOString()}
              data-schedule-tick
              className="absolute top-0 h-full border-l pl-2 text-caption text-muted-foreground leading-9"
              style={{ left: x(tick) }}
            >
              {tickLabel(tick)}
            </span>
          ))}
          <span className={styles.todayChip} data-schedule-today-chip>
            {t('schedule.today')}
          </span>
        </th>
      </tr>
    </thead>
  )
}
