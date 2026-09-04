import { useTranslation } from 'react-i18next'
import { resolveUrgency, URGENCY_KEY, URGENCY_TEXT } from '@/entities/deadline/urgency/urgency'
import { EventColorMark } from '@/entities/event/event-color'
import { EventStateMark, EventStateText } from '@/entities/event/event-state-mark/event-state-mark'
import type { EventColor, EventState } from '@/shared/api/types.gen'
import { formatDateRange, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'

export type EventRowData = {
  id: string
  title: string
  organizer?: string | null
  start_at: string
  end_at: string
  state: EventState
  color?: EventColor | null
  registration_deadline?: string | null
  registration_status?: { status: 'TODO' | 'DONE' | 'NOT_REQUIRED' } | null
}

export function EventRow({
  event,
  selected,
  onSelect,
}: {
  event: EventRowData
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')
  const urgency = resolveUrgency({
    deadlineAt: event.registration_deadline,
    status: event.registration_status?.status ?? null,
  })

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-event-row={event.id}
      onClick={() => onSelect(event.id)}
      className={cn(
        'flex h-row w-full shrink-0 items-center gap-3 border-border/60 border-b px-3 text-left',
        'pointer-coarse:h-11',
        'transition-colors duration-instant',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        selected ? 'bg-accent-surface' : 'hover:bg-surface-2',
      )}
    >
      <EventColorMark color={event.color} />
      <EventStateMark state={event.state} labelled={false} />

      <span className="min-w-0 flex-1 truncate font-medium text-copy">{event.title}</span>

      <span className="hidden w-40 shrink-0 truncate text-muted-foreground text-meta md:block">
        {event.organizer ?? t('row.noOrganizer')}
      </span>

      <span className="hidden w-44 shrink-0 truncate text-muted-foreground text-meta lg:block">
        {formatDateRange(event.start_at, event.end_at)}
      </span>

      <span className="w-28 shrink-0 truncate text-right text-caption">
        <span className={URGENCY_TEXT[urgency]}>
          {event.registration_deadline ? formatRelative(event.registration_deadline) : ''}
        </span>
        <span className="sr-only">
          {event.registration_deadline ? ` ${t(URGENCY_KEY[urgency].replace('event:', ''))}` : ''}
        </span>
      </span>

      <EventStateText state={event.state} />
    </button>
  )
}
