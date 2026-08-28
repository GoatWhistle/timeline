import { useTranslation } from 'react-i18next'
import { URGENCY_TEXT } from '@/entities/deadline/urgency/urgency'
import { countdownLabel } from '@/entities/deadline/urgency/urgency-label'
import { UrgencyIcon, UrgencyMark } from '@/entities/deadline/urgency/urgency-mark'
import { EVENT_STATE_COLOR, EVENT_STATE_KEY } from '@/entities/event/event.labels'
import type { BurningItem } from '@/features/burning/model/burning'
import { formatDateRange } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { BurningActions } from '../burning-actions/burning-actions'
import { ReasonTag } from '../reason-tag/reason-tag'

export function BurningRow({
  item,
  selected,
  now,
  onSelect,
}: {
  item: BurningItem
  selected: boolean
  now: Date
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')
  const { event, urgency } = item
  const label = countdownLabel(urgency, item.deadlineAt, now)

  return (
    <div
      data-burning-row={event.id}
      data-urgency={urgency}
      data-actionable={item.actionable}
      className={cn(
        'flex h-row-roomy items-center gap-3 border-border/60 border-b pr-2 pl-0',
        'transition-colors duration-instant',
        selected ? 'bg-accent-surface' : 'hover:bg-surface-3',
      )}
    >
      <span
        aria-hidden="true"
        data-urgency-bar={urgency}
        className={cn(
          'h-full w-[3px] shrink-0',
          urgency === 'overdue' && 'bg-urgency-overdue',
          urgency === 'today' && 'bg-urgency-today',
          urgency === 'soon' && 'bg-urgency-soon',
          urgency === 'calm' && 'bg-transparent',
          urgency === 'done' && 'bg-urgency-done',
          urgency === 'waived' && 'bg-urgency-waived',
        )}
      />

      <button
        type="button"
        role="option"
        aria-selected={selected}
        data-event-row={event.id}
        onClick={() => onSelect(event.id)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 py-1 text-left',
          'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', EVENT_STATE_COLOR[event.state])}
        />

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-copy">{event.title}</span>
          <span className="flex items-center gap-1.5 truncate text-meta text-muted-foreground">
            <ReasonTag reason={item.reason} />
            <span className="truncate">{formatDateRange(event.start_at, event.end_at)}</span>
            <span className="@lg:hidden flex shrink-0 items-center gap-1">
              <UrgencyIcon urgency={urgency} className={URGENCY_TEXT[urgency]} />
              <span className={cn('tabular whitespace-nowrap', URGENCY_TEXT[urgency])}>
                {label}
              </span>
            </span>
          </span>
        </span>

        <span className="@3xl:block hidden w-36 shrink-0 truncate text-muted-foreground text-meta">
          {event.organizer ?? t('row.noOrganizer')}
        </span>

        <span className="@lg:flex hidden w-48 shrink-0 justify-end">
          <UrgencyMark urgency={urgency} label={label} />
        </span>

        <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
      </button>

      <BurningActions item={item} />
    </div>
  )
}
