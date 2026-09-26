import { cn } from '@/shared/styling/class-names/class-names'

export const CORNER_ARROW_STROKE = 4.5

export function CornerArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={CORNER_ARROW_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-corner-arrow=""
      className={cn('size-4 shrink-0', className)}
    >
      <path d="M7 7h10v10" />
      <path d="M10 14 17 7" />
    </svg>
  )
}
