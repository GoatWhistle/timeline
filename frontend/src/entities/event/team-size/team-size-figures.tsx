import { User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export const FIGURE_LIMIT = 8

export type TeamSizeRange = { min: number; max: number }

export function teamSizeRange(
  min: number | undefined,
  max: number | undefined,
): TeamSizeRange | null {
  if (min === undefined && max === undefined) return null
  const low = min ?? max
  const high = max ?? min
  if (low === undefined || high === undefined) return null
  if (low < 1 || high < low) return null
  return { min: low, max: high }
}

export type FigureSlot = { position: number; optional: boolean }

export function figureSlots(range: TeamSizeRange): FigureSlot[] {
  return Array.from({ length: range.max }, (_, index) => ({
    position: index + 1,
    optional: index >= range.min,
  }))
}

function figureLabel(range: TeamSizeRange): { key: string; values: Record<string, number> } {
  if (range.min === range.max) return { key: 'place.teamExact', values: { size: range.max } }
  return { key: 'place.teamRange', values: { min: range.min, max: range.max } }
}

export function TeamSizeFigures({
  min,
  max,
  className,
}: {
  min?: number
  max?: number
  className?: string
}) {
  const { t } = useTranslation('event')
  const range = teamSizeRange(min, max)
  if (!range) return null

  const label = figureLabel(range)
  const text = t(label.key, label.values)
  const overflow = range.max > FIGURE_LIMIT

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={text}>
      <span aria-hidden="true" className="flex items-center gap-0.5 text-foreground">
        {overflow ? (
          <User className="size-4" />
        ) : (
          figureSlots(range).map((slot) => (
            <User
              key={slot.position}
              className={cn('size-4', slot.optional && 'text-faint-foreground')}
              strokeWidth={slot.optional ? 1.5 : 2}
            />
          ))
        )}
      </span>
      {overflow && (
        <span aria-hidden="true" className="font-medium text-copy tabular-nums">
          {range.min === range.max ? range.max : `${range.min}–${range.max}`}
        </span>
      )}
      <span className="sr-only">{text}</span>
    </span>
  )
}
