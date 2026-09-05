import { useTranslation } from 'react-i18next'
import type { TeamResponse } from '@/shared/api/types.gen'
import {
  SummaryBar,
  SummaryDivider,
  SummaryMetric,
} from '@/shared/ui/data-display/summary-bar/summary-bar'

export function TeamsSummary({ teams }: { teams: TeamResponse[] }) {
  const { t } = useTranslation('team')

  const invited = teams.filter((team) => team.my_state === 'INVITED').length
  const leading = teams.filter((team) => team.is_lead).length

  return (
    <SummaryBar label={t('summary.title')}>
      <SummaryMetric label={t('summary.total')} value={teams.length} />
      <SummaryMetric label={t('summary.leading')} value={leading} />
      <SummaryDivider />
      <SummaryMetric
        label={t('summary.invited')}
        value={invited}
        tone={invited > 0 ? 'text-primary' : undefined}
      />
    </SummaryBar>
  )
}
