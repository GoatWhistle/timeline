import { Minus, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented, type SegmentedOption } from '@/shared/ui/navigation/segmented'
import { Button } from '@/shared/ui/primitives/button'
import {
  MAX_DAY_WIDTH,
  MIN_DAY_WIDTH,
  SCHEDULE_SCALES,
  type ScheduleScale,
} from '../../model/schedule-scale'
import styles from './view-tabs.module.css'

const LABEL_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.week',
  month: 'schedule.month',
  quarter: 'schedule.quarter',
  year: 'schedule.year',
  all: 'schedule.all',
}

export type ViewTabsProps = {
  value: ScheduleScale
  onChange: (next: ScheduleScale) => void
  onZoom?: (direction: 1 | -1) => void
  dayWidth?: number
  canZoom?: boolean
}

export function ViewTabs({ value, onChange, onZoom, dayWidth, canZoom = false }: ViewTabsProps) {
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
        label={t('schedule.zoomLegend')}
      />

      {canZoom && (
        <div className={styles.zoom} data-schedule-zoom>
          <span className={styles.hint}>{t('schedule.zoomHint')}</span>
          <Button
            size="icon"
            variant="outline"
            data-schedule-zoom-out
            aria-label={t('schedule.zoomOut')}
            disabled={dayWidth !== undefined && dayWidth <= MIN_DAY_WIDTH}
            onClick={() => onZoom?.(-1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            data-schedule-zoom-in
            aria-label={t('schedule.zoomIn')}
            disabled={dayWidth !== undefined && dayWidth >= MAX_DAY_WIDTH}
            onClick={() => onZoom?.(1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
