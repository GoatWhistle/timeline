import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EventStateSign } from '@/entities/event/event-state-mark/event-state-sign'
import type { EventState } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Skeleton } from '@/shared/ui/states'
import { COUNTED_STATES, eventStateCountsQuery, overdueCountQuery } from './admin-stats.queries'
import { CoverageMetric } from './coverage-metric/coverage-metric'

function Metric({
  label,
  value,
  pending,
  state,
  tone,
  onSelect,
  active,
}: {
  label: string
  value: number | undefined
  pending: boolean
  state?: EventState
  tone?: string
  onSelect?: () => void
  active?: boolean
}) {
  const { t } = useTranslation()
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        {state && <EventStateSign state={state} />}
        <span className="text-caption text-muted-foreground">{label}</span>
      </span>
      {pending ? (
        <Skeleton className="mt-0.5 h-4 w-8" />
      ) : (
        <span className={cn('tabular font-medium text-copy', tone)}>
          {value ?? t('common:state.dash')}
        </span>
      )}
    </>
  )

  const shell = 'flex min-w-20 flex-col gap-0.5 rounded-control px-2.5 py-1.5 text-left'

  if (!onSelect) return <div className={shell}>{body}</div>

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        shell,
        'transition-colors duration-instant hover:bg-surface-2',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        active && 'bg-accent-surface',
      )}
    >
      {body}
    </button>
  )
}

export function AdminStats({
  activeState,
  onSelectState,
}: {
  activeState?: string
  onSelectState?: (state: EventState) => void
}) {
  const { t } = useTranslation('event')
  const counts = useQuery(eventStateCountsQuery())
  const overdue = useQuery(overdueCountQuery())

  return (
    <section
      aria-label={t('stats.title')}
      className="flex flex-wrap items-center gap-1 border-border border-b px-2 py-1.5"
    >
      {COUNTED_STATES.map((state) => (
        <Metric
          key={state}
          label={t(EVENT_STATE_KEY[state])}
          value={counts.data?.[state]}
          pending={counts.isPending}
          state={state}
          active={activeState === state}
          onSelect={onSelectState ? () => onSelectState(state) : undefined}
        />
      ))}
      <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
      <Metric
        label={t('stats.overdue')}
        value={overdue.data}
        pending={overdue.isPending}
        tone={overdue.data ? 'text-urgency-overdue' : undefined}
      />
      <CoverageMetric />
    </section>
  )
}
