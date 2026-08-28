import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'
import { SCHEDULE_SCALES, type ScheduleScale } from '../model/schedule-scale'

const LABEL_KEY: Record<ScheduleScale, string> = {
  week: 'schedule.week',
  month: 'schedule.month',
  quarter: 'schedule.quarter',
}

export type ZoomSwitchProps = {
  value: ScheduleScale
  onChange: (next: ScheduleScale) => void
  onToday: () => void
}

export function ZoomSwitch({ value, onChange, onToday }: ZoomSwitchProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <fieldset className="flex gap-1">
        <legend className="sr-only">{t('schedule.zoomLegend')}</legend>
        {SCHEDULE_SCALES.map((scale) => (
          <Button
            key={scale}
            size="sm"
            variant={value === scale ? 'default' : 'outline'}
            aria-pressed={value === scale}
            onClick={() => onChange(scale)}
          >
            {t(LABEL_KEY[scale])}
          </Button>
        ))}
      </fieldset>
      <Button size="sm" variant="outline" data-schedule-today onClick={onToday}>
        {t('schedule.today')}
      </Button>
    </div>
  )
}
