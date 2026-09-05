import { useTranslation } from 'react-i18next'
import {
  PRIZE_RANK_ICON,
  PRIZE_RANK_KEY,
  PRIZE_RANK_TEXT,
  rankOfPlace,
} from '@/entities/prize/prize-place'
import { cn } from '@/shared/styling/class-names/class-names'

export function usePrizePlaceLabel(): (place: number) => string {
  const { t } = useTranslation()
  return (place: number) => t(PRIZE_RANK_KEY[rankOfPlace(place)], { place })
}

export function PrizePlaceMark({ place, className }: { place: number; className?: string }) {
  const label = usePrizePlaceLabel()
  const rank = rankOfPlace(place)
  const Icon = PRIZE_RANK_ICON[rank]

  return (
    <span
      data-prize-rank={rank}
      className={cn('inline-flex shrink-0 items-center gap-1.5', PRIZE_RANK_TEXT[rank], className)}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="font-medium text-caption">{label(place)}</span>
    </span>
  )
}
