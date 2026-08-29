import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'
import { SCHEDULE_SCALES, type ScheduleScale } from '../../model/schedule-scale'
import styles from './view-tabs.module.css'

const LABEL_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.week',
  month: 'schedule.month',
  quarter: 'schedule.quarter',
}

export type ViewTabsProps = {
  value: ScheduleScale
  onChange: (next: ScheduleScale) => void
  onToday: () => void
}

export function ViewTabs({ value, onChange, onToday }: ViewTabsProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.tabs} role="tablist" aria-label={t('schedule.zoomLegend')}>
      {SCHEDULE_SCALES.map((scale) => (
        <button
          key={scale}
          type="button"
          role="tab"
          aria-selected={value === scale}
          data-schedule-tab={scale}
          className={styles.tab}
          onClick={() => onChange(scale)}
        >
          {t(LABEL_KEY[scale])}
        </button>
      ))}
      <div className={styles.spacer}>
        <Button size="sm" variant="outline" data-schedule-today onClick={onToday}>
          {t('schedule.today')}
        </Button>
      </div>
    </div>
  )
}
