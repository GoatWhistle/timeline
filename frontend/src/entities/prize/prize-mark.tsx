import { Sparkles } from 'lucide-react'
import { PrizePlaceMark } from '@/entities/prize/prize-place-mark'
import { cn } from '@/shared/styling/class-names/class-names'

export function NominationMark({ title, className }: { title: string; className?: string }) {
  return (
    <span
      data-prize-rank="NOMINATION"
      className={cn('inline-flex min-w-0 items-center gap-1.5 text-medal-plain', className)}
    >
      <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words font-medium text-caption">{title}</span>
    </span>
  )
}

export function PrizeMark({
  place,
  title,
  className,
}: {
  place?: number | undefined
  title?: string | undefined
  className?: string
}) {
  if (place !== undefined) return <PrizePlaceMark place={place} className={className} />
  return <NominationMark title={title ?? ''} className={className} />
}
