import { useTranslation } from 'react-i18next'
import type { Urgency } from '@/entities/deadline/urgency/urgency'
import { URGENCY_TEXT } from '@/entities/deadline/urgency/urgency'
import { UrgencyIcon } from '@/entities/deadline/urgency/urgency-mark'
import type { BurningSummary as Summary } from '@/features/burning/model/burning-summary'
import { cn } from '@/shared/styling/class-names/class-names'

const LEVELS: { urgency: Urgency; read: (summary: Summary) => number }[] = [
  { urgency: 'overdue', read: (summary) => summary.overdue },
  { urgency: 'today', read: (summary) => summary.today },
  { urgency: 'soon', read: (summary) => summary.soon },
]

export function BurningSummaryStrip({ summary }: { summary: Summary }) {
  const { t } = useTranslation('event')

  return (
    <section
      aria-label={t('burning.summaryAria')}
      className="flex flex-wrap items-center gap-1 border-border border-b px-2 py-1.5"
    >
      {LEVELS.map(({ urgency, read }) => {
        const count = read(summary)
        return (
          <span
            key={urgency}
            data-summary-level={urgency}
            className={cn(
              'flex min-w-24 items-center gap-1.5 rounded-control px-2.5 py-1',
              count > 0 ? URGENCY_TEXT[urgency] : 'text-faint-foreground',
            )}
          >
            <UrgencyIcon urgency={urgency} />
            <span className="tabular font-medium text-copy">{count}</span>
            <span className="text-caption">{t(`urgency.${urgency}`)}</span>
          </span>
        )
      })}

      <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

      <span className="flex min-w-24 items-center gap-1.5 px-2.5 py-1 text-muted-foreground">
        <span className="tabular font-medium text-copy">{summary.actionable}</span>
        <span className="text-caption">{t('burning.needsAction')}</span>
      </span>
    </section>
  )
}
