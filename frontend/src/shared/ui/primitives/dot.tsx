import { cn } from '@/shared/styling/class-names/class-names'

export type DotShape = 'round' | 'square' | 'diamond' | 'ring' | 'bar'

export const DOT_SHAPE: Record<DotShape, string> = {
  round: 'rounded-pill',
  square: 'rounded-[1px]',
  diamond: 'rotate-45 rounded-[1px]',
  ring: 'rounded-pill border-2 border-current bg-transparent',
  bar: 'h-1 w-3 rounded-[1px]',
}

export function Dot({ shape = 'round', className }: { shape?: DotShape; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-dot-shape={shape}
      className={cn('size-2 shrink-0', DOT_SHAPE[shape], className)}
    />
  )
}
