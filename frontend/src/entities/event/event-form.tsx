import { type ReactNode, useState } from 'react'
import type { EventKind, EventResponse } from '@/shared/api/types.gen'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { defaultRange, type EventFormPayload } from './event-form.payload'
import type { MeetupFormValues } from './event-form.schema'
import { useStagePipeline } from './event-form.stages'
import { HackathonForm } from './hackathon-form'
import { MeetupForm } from './meetup-form'

export type { EventFormPayload }

export type EventFormMode = 'create' | 'edit'

export function EventForm({
  event,
  mode = 'create',
  submitLabel,
  cover,
  onSubmit,
}: {
  event?: EventResponse
  mode?: EventFormMode
  submitLabel: string
  cover?: ReactNode
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'HACKATHON')
  const [range, setRange] = useState<MomentRange>(() => defaultRange(event))
  const [draft, setDraft] = useState<Partial<MeetupFormValues>>({})
  const pipeline = useStagePipeline(kind, event !== undefined)

  const shared = {
    submitLabel,
    range,
    draft,
    pipeline,
    staged: mode === 'create',
    onKindChange: setKind,
    onDraft: setDraft,
    onRangeChange: setRange,
    onSubmit,
    ...(event ? { event } : {}),
    ...(cover ? { cover } : {}),
  }

  return kind === 'MEETUP' ? (
    <MeetupForm key="MEETUP" {...shared} />
  ) : (
    <HackathonForm key="HACKATHON" {...shared} />
  )
}
