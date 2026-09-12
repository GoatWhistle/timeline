import { useTranslation } from 'react-i18next'
import type { PublicProfileSummary } from '@/shared/api/types.gen'

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-caption">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-copy">{value}</span>
    </div>
  )
}

export function ProfileSummary({ summary }: { summary?: PublicProfileSummary }) {
  const { t } = useTranslation()
  if (!summary) return null

  return (
    <div className="flex flex-col gap-1.5">
      <SummaryRow label={t('publicProfile.summary.events')} value={String(summary.event_count)} />
      <SummaryRow label={t('publicProfile.summary.teams')} value={String(summary.team_count)} />
      {summary.on_time_registration_rate !== undefined &&
        summary.on_time_registration_rate !== null && (
          <SummaryRow
            label={t('publicProfile.summary.onTime')}
            value={`${Math.round(summary.on_time_registration_rate * 100)}%`}
          />
        )}
    </div>
  )
}
