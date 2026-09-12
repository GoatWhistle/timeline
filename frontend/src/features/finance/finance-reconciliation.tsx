import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventFinanceResponse } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Badge } from '@/shared/ui/primitives/badge'

export function discrepancyTone(value: string): 'reserve' | 'overspend' | 'balanced' {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount === 0) return 'balanced'
  return amount > 0 ? 'reserve' : 'overspend'
}

function Figure({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd
        className={
          strong ? 'font-semibold text-heading tabular-nums' : 'font-medium text-copy tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}

export function FinanceReconciliation({ finance }: { finance: EventFinanceResponse }) {
  const { t } = useTranslation('event')
  const currency = finance.prize_currency ?? undefined
  const money = (value: string | null | undefined): ReactNode => {
    if (value === null || value === undefined) return <NoValue />
    return formatMoney(value, currency) ?? value
  }

  const tone = finance.discrepancy ? discrepancyTone(finance.discrepancy) : null

  return (
    <section
      aria-label={t('finance.reconciliation')}
      data-finance-reconciliation
      className="flex flex-col gap-3 rounded-control border border-border bg-surface-1 p-4"
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <Figure label={t('place.prizePool')} value={money(finance.prize_pool)} strong />
        <Figure label={t('finance.distributedTracks')} value={money(finance.distributed_tracks)} />
        <Figure label={t('finance.distributedCases')} value={money(finance.distributed_cases)} />
        <Figure label={t('place.prizeDistributed')} value={money(finance.distributed)} strong />
        <Figure label={t('place.prizeUnallocated')} value={money(finance.unallocated)} />
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-t pt-3">
        <span className="text-caption text-muted-foreground">{t('finance.discrepancy')}</span>
        {finance.discrepancy_known && finance.discrepancy !== undefined ? (
          <>
            <span data-discrepancy-tone={tone} className="font-semibold text-heading tabular-nums">
              {money(finance.discrepancy)}
            </span>
            <Badge tone={tone === 'overspend' ? 'danger' : 'neutral'}>
              {t(`finance.tone.${tone}`)}
            </Badge>
          </>
        ) : (
          <span className="text-copy text-muted-foreground">{t('finance.noPool')}</span>
        )}
      </div>

      <p className="text-caption text-muted-foreground">{t('finance.discrepancyHint')}</p>
    </section>
  )
}
