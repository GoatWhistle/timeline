import { cn } from '@/shared/styling/class-names/class-names'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-8 shrink-0', className)}
    >
      <path
        d="M4 12h16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="4" cy="12" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="20" cy="12" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="12" r="5.5" fill="currentColor" />
    </svg>
  )
}
