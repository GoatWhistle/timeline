import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { teamProgressQuery } from '@/features/burning/burning.queries'
import { progressRatio } from '@/features/burning/model/team-progress'
import { Skeleton } from '@/shared/ui/states'

export function TeamProgressBar({ eventId, enabled }: { eventId: string; enabled: boolean }) {
  const { t } = useTranslation('event')
  const query = useQuery(teamProgressQuery(eventId, enabled))

  if (!enabled || query.isError) return null
  if (query.isPending) return <Skeleton className="h-3 w-32" />

  const progress = query.data
  if (!progress || progress.required <= 0) return null

  const percent = Math.round(progressRatio(progress) * 100)
  const ratio = t('burning.team.ratio', { done: progress.done, required: progress.required })

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-baseline gap-2">
        <span className="tabular font-medium text-copy">{ratio}</span>
        <span className="text-caption text-muted-foreground">{t('burning.team.title')}</span>
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.required}
        aria-valuenow={progress.done}
        aria-label={t('burning.team.aria', {
          done: progress.done,
          required: progress.required,
        })}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <span
          data-team-fill
          style={{ width: `${percent}%` }}
          className="block h-full rounded-full bg-status-done"
        />
      </div>

      {progress.waived > 0 && (
        <p className="text-caption text-muted-foreground">
          {t('burning.team.waived', { count: progress.waived })}
        </p>
      )}

      <p className="text-caption text-faint-foreground">{t('burning.team.selfReport')}</p>
    </div>
  )
}
