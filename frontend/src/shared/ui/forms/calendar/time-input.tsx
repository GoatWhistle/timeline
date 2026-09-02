import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function TimeInput({
  id,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  id: string
  value: string
  invalid?: boolean
  describedBy?: string | undefined
  onChange: (time: string) => void
}) {
  const { t } = useTranslation('event')

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="00:00"
      maxLength={5}
      value={value}
      aria-label={t('calendar.timeAria')}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(normalize(event.target.value))}
      className={cn(
        'h-9 w-24 rounded-md border border-input bg-transparent px-3 text-copy tabular-nums shadow-xs',
        'transition-colors motion-safe:duration-instant',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'aria-invalid:border-destructive aria-invalid:outline-destructive',
      )}
    />
  )
}

export function normalize(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}
