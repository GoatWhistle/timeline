import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { Segmented, type SegmentedOption } from '@/shared/ui/navigation/segmented'
import { Button } from '@/shared/ui/primitives/button'
import { SCHEDULE_SCALES, type ScheduleScale } from '../../model/schedule-scale'
import styles from './view-tabs.module.css'

const LABEL_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.week',
  month: 'schedule.month',
  quarter: 'schedule.quarter',
  year: 'schedule.year',
}

const PREVIOUS_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.previousWeek',
  month: 'schedule.previousMonth',
  quarter: 'schedule.previousQuarter',
  year: 'schedule.previousYear',
}

const NEXT_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.nextWeek',
  month: 'schedule.nextMonth',
  quarter: 'schedule.nextQuarter',
  year: 'schedule.nextYear',
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
          <Button
            size="icon"
            variant="outline"
            data-schedule-previous
            aria-label={t(PREVIOUS_KEY[value])}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>

          <button
            type="button"
            className={cn(styles.present, TOUCH_REACH)}
            data-schedule-present
            data-at-present={atPresent ? 'true' : 'false'}
            aria-label={t('schedule.periodCurrent', { period })}
            aria-disabled={atPresent ? 'true' : 'false'}
            onClick={() => {
              if (!atPresent) onPresent?.()
            }}
          >
            <span className={styles.periodText} data-schedule-period-label>
              {period}
            </span>
            {!atPresent && <LocateFixed className={styles.presentIcon} aria-hidden="true" />}
            {!atPresent && <span className="sr-only">{t('schedule.backToPresent')}</span>}
          </button>

          <Button
            size="icon"
            variant="outline"
            data-schedule-next
            aria-label={t(NEXT_KEY[value])}
            onClick={() => onStep(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  )
}
