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
  'relative flex size-tap items-center justify-center text-copy tabular-nums transition-colors motion-safe:duration-instant sm:size-9'

function bandShape(day: DayState): string {
  const spans = day.rangeStart !== day.rangeEnd
  if (!spans) return 'rounded-control'
  if (day.rangeStart) return 'rounded-control rounded-r-none'
  if (day.rangeEnd) return 'rounded-control rounded-l-none'
  return 'rounded-none'
}

export function dayClassName(day: DayState): string {
  const banded = day.rangeStart || day.rangeEnd
  const middle = day.inRange && !banded
  return cn(
    BASE,
    banded || middle ? bandShape(day) : 'rounded-control',
    day.outside && 'text-faint-foreground',
    day.disabled && 'cursor-not-allowed text-faint-foreground line-through opacity-60',
    !day.disabled && !day.selected && !banded && 'hover:bg-accent-surface',
    middle && !day.selected && 'bg-accent-surface text-accent-surface-foreground',
    banded && 'bg-primary font-semibold text-primary-foreground',
    day.selected && 'bg-primary font-semibold text-primary-foreground',
    day.today && !day.selected && !banded && 'font-semibold',
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
      data-range-start={day.rangeStart ? 'true' : undefined}
      data-range-end={day.rangeEnd ? 'true' : undefined}
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
          data-today-dot=""
          className={cn(
            'absolute bottom-1 size-1 rounded-pill',
            day.selected || day.rangeStart || day.rangeEnd ? 'bg-primary-foreground' : 'bg-primary',
          )}
        />
      )}
    </button>
  )
}
