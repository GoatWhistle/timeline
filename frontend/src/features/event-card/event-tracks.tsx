import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { eventTracksQuery } from '@/entities/event/event.queries'
import type { EventTrackListResponse } from '@/shared/api/types.gen'
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
  const { t } = useTranslation('event')
  const money = formatMoney(amount, currency)
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-caption text-muted-foreground">{t('place.trackPlace', { place })}</span>
      <span className="font-medium text-copy text-prize tabular-nums">{money ?? amount}</span>
    </div>
  )
}

export function EventTracks({ tracks }: { tracks: EventTrackListResponse }) {
  const { t } = useTranslation('event')
  const currency = tracks.prize_currency ?? undefined
  const distributed = formatMoney(tracks.distributed, currency)
  const unallocated = formatMoney(tracks.unallocated, currency)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('place.tracks')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tracks.items.length === 0 && (
          <p className="text-copy text-muted-foreground">{t('place.noTracks')}</p>
        )}

        {tracks.items.map((track) => {
          const total = formatMoney(track.prize_total, currency)
          return (
            <section
              key={track.id}
              className="flex flex-col gap-2 border-border border-b pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="min-w-0 font-medium text-copy text-heading">
                  <Badge tone="neutral" className="mr-2 tabular-nums">
                    {track.track_no}
                  </Badge>
                  {track.name}
                </h3>
                {total && (
                  <span className="font-semibold text-copy text-prize tabular-nums">
                    <span className="sr-only">{t('place.trackPrizeTotal')} </span>
                    {total}
                  </span>
                )}
              </div>

              {track.description && (
                <p className="max-w-prose text-copy text-muted-foreground">{track.description}</p>
              )}

              {track.prizes.length > 0 && (
                <div className="flex flex-col">
                  {track.prizes.map((prize) => (
                    <PrizeRow
                      key={prize.id}
                      place={prize.place}
                      amount={prize.amount}
                      currency={currency}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {distributed && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-border border-t pt-3 text-caption">
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">{t('place.prizeDistributed')}</dt>
              <dd className="font-medium tabular-nums">{distributed}</dd>
            </div>
            {unallocated && (
              <div className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">{t('place.prizeUnallocated')}</dt>
                <dd className="font-medium tabular-nums">{unallocated}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

export function EventTracksSection({ eventId }: { eventId: string }) {
  const { data } = useQuery(eventTracksQuery(eventId))
  if (!data || data.items.length === 0) return null
  return <EventTracks tracks={data} />
}
