import type { ReactNode } from 'react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import type { EventKind } from '@/shared/api/types.gen'
import {
  type MomentRange,
  MomentRangeFields,
  type RangeProblem,
} from '@/shared/ui/forms/calendar/moment-range'
import { EventBasicsFields } from './event-common-fields'
import type { MeetupFormValues } from './event-form.schema'
import type { StageId } from './event-form.stages'
import { EventPlaceFields } from './event-place-fields'
import { EventKindChoice, EventKindLocked } from './event-taxonomy-fields'

export function EventStagePanel({
  stage,
  kind,
  kindLocked,
  onKindChange,
  control,
  register,
  errors,
  format,
  range,
  rangeError,
  onRangeChange,
  onOrganizerPick,
  prize,
}: {
  stage: StageId
  kind: EventKind
  kindLocked: boolean
  onKindChange: (next: EventKind) => void
  control: Control<MeetupFormValues>
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
  format: MeetupFormValues['format']
  range: MomentRange
  rangeError: RangeProblem | null
  onRangeChange: (next: MomentRange) => void
  onOrganizerPick: (value: string) => void
  prize?: ReactNode
}) {
  if (stage === 'kind') {
    if (kindLocked) return <EventKindLocked value={kind} />
    return <EventKindChoice value={kind} onChange={onKindChange} />
  }

  if (stage === 'basics') {
    return (
      <EventBasicsFields
        control={control}
        register={register}
        errors={errors}
        onOrganizerPick={onOrganizerPick}
      />
    )
  }

  if (stage === 'period') {
    return (
      <MomentRangeFields
        value={range}
        startError={rangeError?.start}
        endError={rangeError?.end}
        onChange={onRangeChange}
      />
    )
  }

  if (stage === 'place') {
    return (
      <EventPlaceFields control={control} register={register} errors={errors} format={format} />
    )
  }

  return <>{prize}</>
}
