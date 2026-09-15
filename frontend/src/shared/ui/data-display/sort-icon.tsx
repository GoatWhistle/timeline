import { ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/shared/styling/class-names/class-names'

export function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) {
    return <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden="true" />
  }

  return (
    <ArrowUp
      aria-hidden="true"
      className={cn(
        'size-3 shrink-0',
        'motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out',
        order === 'desc' ? 'rotate-180' : 'rotate-0',
      )}
    />
  )
}
