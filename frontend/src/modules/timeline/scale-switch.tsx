import { Button } from '@/shared/ui/button'
import type { TimelineScale } from './timeline'

const OPTIONS: { value: TimelineScale; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'week', label: 'Неделя' },
]

export function ScaleSwitch({
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
