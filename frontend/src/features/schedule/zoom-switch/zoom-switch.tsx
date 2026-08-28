import { useTranslation } from 'react-i18next'
import type { ScheduleScale } from '@/features/schedule/model/schedule-scale'
import { Button } from '@/shared/ui/primitives/button'

const OPTIONS: { value: ScheduleScale; labelKey: string }[] = [
  { value: 'month', labelKey: 'schedule.month' },
  { value: 'week', labelKey: 'schedule.week' },
]

export function ZoomSwitch({
  value,
  onChange,
}: {
  value: ScheduleScale
  onChange: (next: ScheduleScale) => void
}) {
  const { t } = useTranslation()

  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">{t('schedule.zoomLegend')}</legend>
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {t(option.labelKey)}
        </Button>
      ))}
    </fieldset>
  )
}
