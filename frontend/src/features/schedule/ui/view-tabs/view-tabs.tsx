import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { Segmented, type SegmentedOption } from '@/shared/ui/navigation/segmented'
import { SCHEDULE_SCALES, type ScheduleScale } from '../../model/schedule-scale'
import styles from './view-tabs.module.css'

const LABEL_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.week',
  month: 'schedule.month',
  quarter: 'schedule.quarter',
  year: 'schedule.year',
  all: 'schedule.all',
}

const PREVIOUS_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.previousWeek',
  month: 'schedule.previousMonth',
  quarter: 'schedule.previousQuarter',
  year: 'schedule.previousYear',
  all: 'schedule.earlier',
}

const NEXT_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.nextWeek',
  month: 'schedule.nextMonth',
  quarter: 'schedule.nextQuarter',
  year: 'schedule.nextYear',
  all: 'schedule.later',
}

export type ViewTabsProps = {
  value: ScheduleScale
  onChange: (next: ScheduleScale) => void
  period?: string
  onStep?: (direction: 1 | -1) => void
  onPresent?: () => void
  atPresent?: boolean
}

export function ViewTabs({
  value,
  onChange,
  period,
  onStep,
  onPresent,
  atPresent = true,
}: ViewTabsProps) {
  const { t } = useTranslation()

  const options = useMemo<SegmentedOption<ScheduleScale>[]>(
    () => SCHEDULE_SCALES.map((scale) => ({ value: scale, label: t(LABEL_KEY[scale]) })),
    [t],
  )

  return (
    <div className={styles.bar}>
      <Segmented
        value={value}
        options={options}
        onChange={onChange}
        label={t('schedule.scaleLegend')}
      />

      {onStep && (
        <nav className={styles.period} data-schedule-period aria-label={t('schedule.periodNav')}>
          <button
            type="button"
            className={cn(styles.step, TOUCH_REACH)}
            data-schedule-previous
            aria-label={t(PREVIOUS_KEY[value])}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft className={styles.stepIcon} aria-hidden="true" />
          </button>

          <p
            className={styles.present}
            data-schedule-present
            data-at-present={atPresent ? 'true' : 'false'}
          >
            <span className="sr-only">{t('schedule.periodCurrent', { period })}</span>
            <span
              key={period}
              className={styles.periodText}
              data-schedule-period-label
              aria-hidden="true"
            >
              {period}
            </span>
          </p>

          <button
            type="button"
            className={cn(styles.step, TOUCH_REACH)}
            data-schedule-next
            aria-label={t(NEXT_KEY[value])}
            onClick={() => onStep(1)}
          >
            <ChevronRight className={styles.stepIcon} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={cn(styles.home, TOUCH_REACH)}
            data-schedule-home
            aria-label={t('schedule.backToPresent')}
            disabled={atPresent}
            onClick={() => onPresent?.()}
          >
            <LocateFixed className={styles.homeIcon} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
