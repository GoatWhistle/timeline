import { useTranslation } from 'react-i18next'
import { countOf } from '@/entities/personal/personal-fields'
import type { HistoryItem, PageMeta } from '@/shared/api/types.gen'
import {
  SummaryBar,
  SummaryDivider,
  SummaryMetric,
} from '@/shared/ui/data-display/summary-bar/summary-bar'

const PODIUM = 3

export function HistorySummary({ items, meta }: { items: HistoryItem[]; meta?: PageMeta }) {
  const { t } = useTranslation('event')

  const total = meta?.total ?? items.length
  const podium = items.filter((item) => {
    const place = countOf(item.outcome?.place)
    return place > 0 && place <= PODIUM
  }).length
  const submissions = items.reduce((sum, item) => sum + item.artifacts.length, 0)
  const tasksDone = items.reduce((sum, item) => sum + item.tasks_done, 0)
  const tasksTotal = items.reduce((sum, item) => sum + item.tasks_total, 0)

  return (
    <SummaryBar label={t('personal.history.summary.title')}>
      <SummaryMetric label={t('personal.history.summary.total')} value={total} />
      <SummaryMetric
        label={t('personal.history.summary.podium')}
        value={podium}
        tone={podium > 0 ? 'text-primary' : undefined}
      />
      <SummaryDivider />
      <SummaryMetric label={t('personal.history.summary.submissions')} value={submissions} />
      <SummaryMetric
        label={t('personal.history.summary.tasks')}
        value={`${tasksDone}/${tasksTotal}`}
      />
    </SummaryBar>
  )
}
