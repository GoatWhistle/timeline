import type { ReactNode } from 'react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import type { EventKind } from '@/shared/api/types.gen'
import { type MomentRange, MomentRangeFields } from '@/shared/ui/forms/calendar/moment-range'
import { EventBasicsFields, EventOriginRow } from './event-common-fields'
import type { MeetupFormValues } from './event-form.schema'
import type { StageId } from './event-form.stages'
import { EventPlaceFields } from './event-place-fields'
import { EventKindChoice } from './event-taxonomy-fields'

export function EventStagePanel({
  stage,
  kind,
  onKindChange,
  control,
  register,
  errors,
  format,
  range,
  rangeError,
  onRangeChange,
  prize,
}: {
  stage: StageId
  kind: EventKind
  onKindChange: (next: EventKind) => void
  control: Control<MeetupFormValues>
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
  format: MeetupFormValues['format']
  range: MomentRange
  rangeError: string | null
  onRangeChange: (next: MomentRange) => void
  prize?: ReactNode
}) {
  if (stage === 'kind') return <EventKindChoice value={kind} onChange={onKindChange} />

  if (stage === 'basics') return <EventBasicsFields register={register} errors={errors} />

  if (stage === 'period') {
    return (
      <MomentRangeFields
        value={range}
        endError={rangeError ?? undefined}
        onChange={onRangeChange}
      />
    )
  }

  if (stage === 'place') {
    return (
      <div className="flex flex-col gap-5">
        <EventOriginRow control={control} />
        <EventPlaceFields control={control} register={register} errors={errors} format={format} />
      </div>
    )
  }

  return <>{prize}</>
}
