import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EventStateSign } from '@/entities/event/event-state-mark/event-state-sign'
import type { EventState } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  SUMMARY_SHELL,
  SummaryBar,
  SummaryDivider,
  SummaryMetric,
} from '@/shared/ui/data-display/summary-bar/summary-bar'
import { Skeleton } from '@/shared/ui/states'
import { COUNTED_STATES, eventStateCountsQuery, overdueCountQuery } from './admin-stats.queries'
import { CoverageMetric } from './coverage-metric/coverage-metric'

function StateMetric({
  label,
  value,
  pending,
  state,
  onSelect,
  active,
}: {
  label: string
  value: number | undefined
  pending: boolean
  state: EventState
  onSelect?: () => void
  active?: boolean
}) {
  const { t } = useTranslation()
  const sign = <EventStateSign state={state} />

  if (!onSelect) {
    return (
      <SummaryMetric
        label={label}
        pending={pending}
        sign={sign}
        value={value ?? t('common:state.dash')}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        SUMMARY_SHELL,
        'transition-colors duration-instant hover:bg-surface-2',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        active && 'bg-accent-surface',
      )}
    >
      <span className="flex items-center gap-1.5">
        {sign}
        <span className="text-caption text-muted-foreground">{label}</span>
      </span>
      {pending ? (
        <Skeleton className="mt-0.5 h-4 w-8" />
      ) : (
        <span className="tabular font-medium text-copy">{value ?? t('common:state.dash')}</span>
      )}
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
    <SummaryBar label={t('stats.title')}>
      {COUNTED_STATES.map((state) => (
        <StateMetric
          key={state}
          label={t(EVENT_STATE_KEY[state])}
          value={counts.data?.[state]}
          pending={counts.isPending}
          state={state}
          active={activeState === state}
          onSelect={onSelectState ? () => onSelectState(state) : undefined}
        />
      ))}
      <SummaryDivider />
      <SummaryMetric
        label={t('stats.overdue')}
        value={overdue.data ?? t('common:state.dash')}
        pending={overdue.isPending}
        tone={overdue.data ? 'text-urgency-overdue' : undefined}
      />
      <CoverageMetric />
    </SummaryBar>
  )
}
