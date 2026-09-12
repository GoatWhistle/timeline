import { useTranslation } from 'react-i18next'
import { PrizeMark } from '@/entities/prize/prize-mark'
import type { FinanceTrack } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'

function TrackBreakdown({
  track,
  currency,
}: {
  track: FinanceTrack
  currency: string | undefined
}) {
  const { t } = useTranslation('event')
  const total = formatMoney(track.prize_total, currency) ?? track.prize_total

  return (
    <li className="flex flex-col gap-2 rounded-control border border-border bg-surface-1 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="min-w-0 break-words font-medium text-heading">
          {t('place.trackNumber', { number: track.track_no })} · {track.name}
        </h4>
        <span className="font-semibold text-copy text-prize tabular-nums">{total}</span>
      </div>

      {track.prizes.length > 0 ? (
        <ul className="flex flex-col">
          {track.prizes.map((prize, index) => (
            <li
              key={`${prize.place ?? prize.title ?? index}`}
              className="flex items-center justify-between gap-4 py-0.5"
            >
              <PrizeMark place={prize.place} title={prize.title} />
              <span className="font-medium text-caption text-prize tabular-nums">
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

export function FinanceTracks({
  tracks,
  currency,
}: {
  tracks: FinanceTrack[]
  currency: string | undefined
}) {
  const { t } = useTranslation('event')

  return (
    <section className="flex flex-col gap-2" aria-label={t('finance.byTrack')}>
      <h3 className="font-medium text-copy text-muted-foreground">{t('finance.byTrack')}</h3>
      {tracks.length === 0 ? (
        <p className="text-copy text-muted-foreground">{t('place.noTracks')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tracks.map((track) => (
            <TrackBreakdown key={track.id} track={track} currency={currency} />
          ))}
        </ul>
      )}
    </section>
  )
}
