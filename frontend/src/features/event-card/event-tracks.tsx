import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { eventTracksQuery } from '@/entities/event/event.queries'
import { PrizePlaceMark } from '@/entities/prize/prize-place-mark'
import type { EventTrackListResponse, EventTrackResponse } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'

function PrizeRow({
  place,
  amount,
  currency,
}: {
  place: number
  amount: string
  currency: string | undefined
}) {
  const money = formatMoney(amount, currency)
  return (
    <li className="flex items-center justify-between gap-4 py-1">
      <PrizePlaceMark place={place} />
      <span className="font-medium text-copy text-prize tabular-nums">{money ?? amount}</span>
    </li>
  )
}

function TrackPanel({
  track,
  currency,
}: {
  track: EventTrackResponse
  currency: string | undefined
}) {
  const { t } = useTranslation('event')
  const total = formatMoney(track.prize_total, currency)

  return (
    <section className="flex flex-col gap-3 rounded-control border border-border bg-surface-1 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <Badge tone="neutral" className="tabular-nums">
            {t('place.trackNumber', { number: track.track_no })}
          </Badge>
          <h3 className="min-w-0 font-semibold text-heading">{track.name}</h3>
        </div>
        {total && (
          <div className="flex flex-col items-end">
            <span className="text-caption text-muted-foreground">{t('place.trackPrizeFund')}</span>
            <span className="font-semibold text-heading text-prize tabular-nums">{total}</span>
          </div>
        )}
      </div>

      {track.description && (
        <p className="max-w-prose text-copy text-muted-foreground">{track.description}</p>
      )}

      {track.prizes.length > 0 && (
        <ul className="flex flex-col border-border border-t pt-2">
          {track.prizes.map((prize) => (
            <PrizeRow
              key={prize.id}
              place={prize.place}
              amount={prize.amount}
              currency={currency}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function EventTracks({ tracks }: { tracks: EventTrackListResponse }) {
  const { t } = useTranslation('event')
  const currency = tracks.prize_currency ?? undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('place.tracks')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tracks.items.length === 0 && (
          <p className="text-copy text-muted-foreground">{t('place.noTracks')}</p>
        )}

        {tracks.items.map((track) => (
          <TrackPanel key={track.id} track={track} currency={currency} />
        ))}
      </CardContent>
    </Card>
  )
}

export function EventTracksSection({ eventId }: { eventId: string }) {
  const { data } = useQuery(eventTracksQuery(eventId))
  if (!data || data.items.length === 0) return null
  return <EventTracks tracks={data} />
}
