import { ArrowDown, ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PrizePlaceMark } from '@/entities/prize/prize-place-mark'
import type { EventTrackResponse } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

export function TrackRow({
  track,
  currency,
  busy,
  canUp,
  canDown,
  onUp,
  onDown,
  onEdit,
  onDelete,
}: {
  track: EventTrackResponse
  currency: string | undefined
  busy: boolean
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('event')
  const total = formatMoney(track.prize_total, currency)

  return (
    <li className="flex flex-col gap-3 rounded-control border border-border bg-surface-1 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <h3 className="flex min-w-0 items-center gap-2 font-medium text-heading">
            <Badge tone="neutral" className="shrink-0 tabular-nums">
              {track.track_no}
            </Badge>
            <span className="min-w-0 break-words">{track.name}</span>
          </h3>
          {track.description && (
            <p className="max-w-prose text-copy text-muted-foreground">{track.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {total && (
            <span className="mr-2 font-semibold text-copy text-prize tabular-nums">
              <span className="sr-only">{t('place.trackPrizeTotal')} </span>
              {total}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={t('tracks.moveUpAria', { name: track.name })}
            disabled={!canUp || busy}
            onClick={onUp}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={t('tracks.moveDownAria', { name: track.name })}
            disabled={!canDown || busy}
            onClick={onDown}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </Button>
          <EditAction label={t('tracks.editAria', { name: track.name })} onClick={onEdit} />
          <DeleteAction label={t('tracks.deleteAria', { name: track.name })} onClick={onDelete} />
        </div>
      </div>

      {track.prizes.length > 0 ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {track.prizes.map((prize) => (
            <li key={prize.id} className="flex items-center gap-2 text-caption">
              <PrizePlaceMark place={prize.place} />
              <span className="font-medium tabular-nums">
                {formatMoney(prize.amount, currency) ?? prize.amount}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-muted-foreground">{t('tracks.noPrizes')}</p>
      )}
    </li>
  )
}
