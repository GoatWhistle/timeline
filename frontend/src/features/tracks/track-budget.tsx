import { useTranslation } from 'react-i18next'
import type { EventTrackListResponse } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'

export function headroomOf(tracks: EventTrackListResponse, excludeTotal = '0'): number | null {
  if (!tracks.unallocated) return null
  return Number(tracks.unallocated) + Number(excludeTotal)
}

export function TrackBudget({ tracks }: { tracks: EventTrackListResponse }) {
  const { t } = useTranslation('event')
  const currency = tracks.prize_currency ?? undefined

  if (!tracks.prize_pool) {
    return <p className="text-caption text-muted-foreground">{t('tracks.noPool')}</p>
  }

  const pool = Number(tracks.prize_pool)
  const distributed = Number(tracks.distributed ?? '0')
  const share = pool > 0 ? Math.min(100, Math.round((distributed / pool) * 100)) : 0

  return (
    <section
      aria-label={t('tracks.budgetTitle')}
      className="flex flex-col gap-3 rounded-control border border-border bg-surface-1 p-4"
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <dt className="text-caption text-muted-foreground">{t('place.prizePool')}</dt>
          <dd className="font-semibold text-heading tabular-nums">
            {formatMoney(tracks.prize_pool, currency) ?? tracks.prize_pool}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-caption text-muted-foreground">{t('place.prizeDistributed')}</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(tracks.distributed, currency) ?? tracks.distributed}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-caption text-muted-foreground">{t('place.prizeUnallocated')}</dt>
          <dd className="font-semibold text-prize tabular-nums">
            {formatMoney(tracks.unallocated, currency) ?? tracks.unallocated}
          </dd>
        </div>
      </dl>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        aria-label={t('tracks.budgetMeter')}
        className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-3"
      >
        <span
          data-budget-fill
          style={{ width: `${share}%` }}
          className="block h-full rounded-pill bg-prize motion-safe:transition-[width] motion-safe:duration-base motion-safe:ease-out"
        />
      </div>
    </section>
  )
}
