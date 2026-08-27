import { cn } from '@/shared/styling/class-names/class-names'

export function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', className)} />
}
