import { cn } from '@/shared/styling/class-names/class-names'
import { type RangeBounds, type RangeValue, ratioOf } from './range-value'

export function tickValues({ min, max }: RangeBounds): number[] {
  const out: number[] = []
  for (let value = min; value <= max; value += 1) out.push(value)
  return out
}

function inRange(tick: number, value: RangeValue): boolean {
  return tick >= value.low && tick <= value.high
}

export function RangeTickMarks({ bounds, value }: { bounds: RangeBounds; value: RangeValue }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2"
    >
      {tickValues(bounds).map((tick) => {
        const inside = inRange(tick, value)
        return (
          <span
            key={tick}
            data-tick-mark={tick}
            data-tick-inside={inside ? 'true' : 'false'}
            style={{ left: `${ratioOf(tick, bounds) * 100}%` }}
            className={cn(
              '-translate-x-1/2 absolute top-1/2 size-1 -translate-y-1/2 rounded-pill',
              'transition-colors duration-base ease-out',
              inside ? 'bg-primary-foreground/70' : 'bg-border-strong',
            )}
          />
        )
      })}
    </div>
  )
}

export function RangeTickLabels({ bounds, value }: { bounds: RangeBounds; value: RangeValue }) {
  return (
    <div aria-hidden="true" className="relative h-4">
      {tickValues(bounds).map((tick) => {
        const inside = inRange(tick, value)
        return (
          <span
            key={tick}
            data-tick={tick}
            data-tick-inside={inside ? 'true' : 'false'}
            style={{ left: `${ratioOf(tick, bounds) * 100}%` }}
            className={cn(
              '-translate-x-1/2 absolute top-0 min-w-4 text-center text-caption tabular-nums',
              'transition-colors duration-base ease-out',
              inside ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {tick}
          </span>
        )
      })}
    </div>
  )
}
