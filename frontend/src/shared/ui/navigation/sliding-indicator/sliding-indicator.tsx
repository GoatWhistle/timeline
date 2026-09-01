import { cn } from '@/shared/styling/class-names/class-names'
import type { IndicatorBox } from './use-sliding-indicator'

export function SlidingIndicator({
  box,
  axis = 'y',
  className,
}: {
  box: IndicatorBox
  axis?: 'x' | 'y'
  className?: string
}) {
  const style =
    axis === 'y'
      ? { transform: `translateY(${box.offset}px)`, height: `${box.size}px` }
      : { transform: `translateX(${box.offset}px)`, width: `${box.size}px` }

  return (
    <span
      aria-hidden="true"
      data-indicator
      style={style}
      className={cn(
        'pointer-events-none absolute rounded-control bg-accent-surface',
        axis === 'y' ? 'inset-x-0 top-0' : 'inset-y-0 left-0',
        'motion-safe:transition-[transform,width,height,opacity] motion-safe:duration-base motion-safe:ease-out',
        box.ready ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}
