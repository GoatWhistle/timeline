import { type ReactNode, useState } from 'react'
import type { EventKind, EventResponse } from '@/shared/api/types.gen'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { defaultRange, type EventFormPayload } from './event-form.payload'
import type { MeetupFormValues } from './event-form.schema'
import { EventKindChoice } from './event-taxonomy-fields'
import { HackathonForm } from './hackathon-form'
import { MeetupForm } from './meetup-form'

export type { EventFormPayload }

export function EventForm({
  event,
  submitLabel,
  cover,
  onSubmit,
}: {
  event?: EventResponse
  submitLabel: string
  cover?: ReactNode
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'HACKATHON')
  const [range, setRange] = useState<MomentRange>(() => defaultRange(event))
  const [draft, setDraft] = useState<Partial<MeetupFormValues>>({})

  const shared = {
    submitLabel,
    range,
    draft,
    onDraft: setDraft,
    onRangeChange: setRange,
    onSubmit,
    ...(event ? { event } : {}),
    ...(cover ? { cover } : {}),
  }

  return (
    <div className="flex flex-col gap-5">
      <EventKindChoice
        value={kind}
        onChange={(next) => {
          setKind(next)
        }}
      />

      {kind === 'MEETUP' ? (
        <MeetupForm key="MEETUP" {...shared} />
      ) : (
        <HackathonForm key="HACKATHON" {...shared} />
      )}
    </div>
  )
}
