import { ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/shared/styling/class-names/class-names'

const TURN = 'motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out'

const FADE =
  'motion-safe:transition-[opacity,scale,rotate] motion-safe:duration-fast motion-safe:ease-out'

export function SortArrow({ order, className }: { order: 'asc' | 'desc'; className?: string }) {
  return (
    <ArrowUp
      aria-hidden="true"
      data-sort-arrow={order}
      className={cn('shrink-0', TURN, order === 'desc' ? 'rotate-180' : 'rotate-0', className)}
    />
  )
}

export function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span
      aria-hidden="true"
      data-sort-icon={active ? order : 'none'}
      className="relative inline-flex size-3 shrink-0"
    >
      <ChevronsUpDown
        className={cn(
          'absolute inset-0 size-3',
          FADE,
          active ? 'scale-50 opacity-0' : 'scale-100 opacity-40',
        )}
      />
      <ArrowUp
        className={cn(
          'absolute inset-0 size-3',
          FADE,
          active ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          active && order === 'desc' ? 'rotate-180' : 'rotate-0',
        )}
      />
    </span>
  )
}
