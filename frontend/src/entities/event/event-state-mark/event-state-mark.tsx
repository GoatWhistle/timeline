import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import type { EventState } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

const STATE_SHAPE: Record<EventState, string> = {
  UNPUBLISHED: 'size-1.5 rounded-[1px] border border-current bg-transparent',
  UPCOMING: 'size-1.5 rounded-full border border-current bg-transparent',
  ACTIVE: 'size-2 rounded-full border-2 border-current bg-current',
  FINISHED: 'size-1.5 rounded-[1px] border border-current bg-current',
  ARCHIVED: 'size-1.5 rounded-[1px] border border-current border-dashed bg-transparent',
}

const STATE_TEXT: Record<EventState, string> = {
  UNPUBLISHED: 'text-state-unpublished',
  UPCOMING: 'text-state-upcoming',
  ACTIVE: 'text-state-active',
  FINISHED: 'text-state-finished',
  ARCHIVED: 'text-state-archived',
}

export function EventStateMark({
  state,
  labelled = true,
  className,
}: {
  state: EventState
  labelled?: boolean
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <span
      data-event-state={state}
      className={cn('inline-flex shrink-0 items-center', STATE_TEXT[state], className)}
    >
      <span aria-hidden="true" className={cn('shrink-0', STATE_SHAPE[state])} />
      {labelled ? <span className="sr-only">{t(EVENT_STATE_KEY[state])}</span> : null}
    </span>
  )
}

export function EventStateText({ state }: { state: EventState }) {
  const { t } = useTranslation()
  return <span className="sr-only">{t(EVENT_STATE_KEY[state])}</span>
}
