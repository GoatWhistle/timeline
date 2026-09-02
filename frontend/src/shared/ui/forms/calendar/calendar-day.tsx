import { cn } from '@/shared/styling/class-names/class-names'

export type DayState = {
  date: string
  dayOfMonth: number
  outside: boolean
  today: boolean
  selected: boolean
  rangeStart: boolean
  rangeEnd: boolean
  inRange: boolean
  disabled: boolean
}

const BASE =
  'relative flex size-9 items-center justify-center rounded-control text-copy tabular-nums transition-colors motion-safe:duration-instant'

export function dayClassName(day: DayState): string {
  return cn(
    BASE,
    day.outside && 'text-faint-foreground',
    day.disabled && 'cursor-not-allowed text-faint-foreground line-through opacity-60',
    !day.disabled && !day.selected && 'hover:bg-accent-surface',
    day.inRange && !day.selected && 'bg-accent-surface text-accent-surface-foreground',
    day.selected && 'bg-primary font-semibold text-primary-foreground',
    day.today && !day.selected && 'font-semibold underline decoration-2 underline-offset-4',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  )
}

export function CalendarDayCell({
  day,
  label,
  tabbable,
  buttonRef,
  onSelect,
}: {
  day: DayState
  label: string
  tabbable: boolean
  buttonRef?: React.Ref<HTMLButtonElement>
  onSelect: (date: string) => void
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-date={day.date}
      data-today={day.today ? 'true' : undefined}
      data-selected={day.selected ? 'true' : undefined}
      data-in-range={day.inRange ? 'true' : undefined}
      data-outside={day.outside ? 'true' : undefined}
      aria-label={label}
      aria-pressed={day.selected}
      aria-disabled={day.disabled}
      aria-current={day.today ? 'date' : undefined}
      tabIndex={tabbable ? 0 : -1}
      className={dayClassName(day)}
      onClick={() => {
        if (day.disabled) return
        onSelect(day.date)
      }}
    >
      {day.dayOfMonth}
      {day.today && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-1 size-1 rounded-full',
            day.selected ? 'bg-primary-foreground' : 'bg-primary',
          )}
        />
      )}
    </button>
  )
}
