import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import type { EventState } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { EventStateSign } from './event-state-sign'

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
    <span data-event-state={state} className={cn('inline-flex shrink-0 items-center', className)}>
      <EventStateSign state={state} />
      {labelled ? <span className="sr-only">{t(EVENT_STATE_KEY[state])}</span> : null}
    </span>
  )
}

export function EventStateText({ state }: { state: EventState }) {
  const { t } = useTranslation()
  return <span className="sr-only">{t(EVENT_STATE_KEY[state])}</span>
}
