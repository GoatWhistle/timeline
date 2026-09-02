import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { OUTCOME_KEY } from '@/entities/personal/outcome.queries'
import { ARTIFACT_KIND_KEY } from '@/entities/personal/personal.labels'
import { countOf, filled } from '@/entities/personal/personal-fields'
import type { HistoryItem } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'

export function HistoryRow({ item }: { item: HistoryItem }) {
  const { t } = useTranslation('event')
  const outcome: HistoryItem['outcome'] | undefined = item.outcome
  const placed = outcome !== undefined && countOf(outcome.place) > 0

  return (
    <li className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link to={`/events/${item.event_id}`} className="font-medium text-copy hover:underline">
          {item.title}
        </Link>
        <span className="text-meta text-muted-foreground">
          {formatDateRange(item.start_at, item.end_at)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {outcome === undefined ? (
          <Badge tone="outline">{t('personal.history.noOutcome')}</Badge>
        ) : (
          <Badge tone="primary">{t(OUTCOME_KEY[outcome.outcome])}</Badge>
        )}
        {placed && <Badge tone="neutral">{outcome.place}</Badge>}
        {outcome !== undefined && filled(outcome.prize) && (
          <Badge tone="neutral">{outcome.prize}</Badge>
        )}
        {filled(item.team_role) && (
          <Badge tone="neutral">
            {t('personal.history.role')}: {item.team_role}
          </Badge>
        )}
        <Badge tone="neutral">
          {item.tasks_total === 0
            ? t('personal.history.noTasks')
            : t('personal.history.tasks', { done: item.tasks_done, total: item.tasks_total })}
        </Badge>
      </div>

      {item.artifacts.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta">
          {item.artifacts.map((artifact) => (
            <li key={artifact.id}>
              <ExternalLink className="text-primary hover:underline" href={artifact.url}>
                {filled(artifact.title) ? artifact.title : t(ARTIFACT_KIND_KEY[artifact.kind])}
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
