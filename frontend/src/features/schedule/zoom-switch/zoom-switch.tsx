import type { TimelineScale } from '@/features/schedule/model/schedule-scale'
import { Button } from '@/shared/ui/primitives/button'

const OPTIONS: { value: TimelineScale; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'week', label: 'Неделя' },
]

export function ZoomSwitch({
  value,
  onChange,
}: {
  value: TimelineScale
  onChange: (next: TimelineScale) => void
}) {
  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">Масштаб шкалы</legend>
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </fieldset>
  )
}
