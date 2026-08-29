import { useQuery } from '@tanstack/react-query'
import { MinusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/states'
import { registrationCoverageQuery } from '../admin-stats.queries'

export function formatShare(share: number): string {
  const percent = share * 100
  if (share > 0 && percent < 1) return '<1%'
  if (share < 1 && percent > 99) return '>99%'
  return `${Math.round(percent)}%`
}

const SHELL = 'flex min-w-24 flex-col gap-0.5 rounded-[6px] px-2.5 py-1.5'

export function CoverageMetric() {
  const { t } = useTranslation('event')
  const coverage = useQuery(registrationCoverageQuery())
  const data = coverage.data

  if (coverage.isPending) {
    return (
      <div className={SHELL}>
        <span className="text-caption text-muted-foreground">{t('stats.coverage')}</span>
        <Skeleton className="mt-0.5 h-4 w-10" />
      </div>
    )
  }

  if (!data?.applicable || data.share === undefined || data.share === null) {
    return (
      <div className={SHELL} title={t('stats.coverageEmptyHint')}>
        <span className="text-caption text-muted-foreground">{t('stats.coverage')}</span>
        <span className="flex items-center gap-1 text-copy text-muted-foreground">
          <MinusCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{t('stats.coverageNotApplicable')}</span>
        </span>
      </div>
    )
  }

  return (
    <div
      className={SHELL}
      title={t('stats.coverageHint', {
        count: data.total,
        done: data.self_reported_done,
        waived: data.not_required,
        outstanding: data.outstanding,
      })}
    >
      <span className="text-caption text-muted-foreground">{t('stats.coverage')}</span>
      <span className="tabular font-medium text-copy text-foreground">
        {formatShare(data.share)}
        <span className="sr-only"> {t('stats.coverageAria')}</span>
      </span>
    </div>
  )
}
