import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { EventResponse } from '@/shared/api/types.gen'
import { type MomentRange, MomentRangeFields } from '@/shared/ui/forms/calendar/moment-range'
import { Button } from '@/shared/ui/primitives/button'
import {
  EventContactFields,
  EventOriginRow,
  EventProseFields,
  EventTitleField,
} from './event-common-fields'
import { buildMeetupPayload, commonDefaults, type EventFormPayload } from './event-form.payload'
import { COMMON_FIELD_NAMES, type MeetupFormValues, meetupSchema } from './event-form.schema'
import { EventPlaceFields } from './event-place-fields'
import { useEventSubmit } from './use-event-submit'

export function MeetupForm({
  event,
  submitLabel,
  cover,
  draft,
  range,
  onDraft,
  onRangeChange,
  onSubmit,
}: {
  event?: EventResponse
  submitLabel: string
  cover?: ReactNode
  draft?: Partial<MeetupFormValues>
  range: MomentRange
  onDraft?: (values: MeetupFormValues) => void
  onRangeChange: (next: MomentRange) => void
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetupFormValues>({
    resolver: zodResolver(meetupSchema),
    defaultValues: { ...commonDefaults(event), ...draft },
  })

  const { rangeError, setRangeError, submit } = useEventSubmit<MeetupFormValues>({
    range,
    fieldNames: COMMON_FIELD_NAMES,
    build: buildMeetupPayload,
    setError,
    onSubmit,
  })

  useEffect(() => {
    if (!onDraft) return
    const subscription = watch((values) => onDraft(values as MeetupFormValues))
    return () => subscription.unsubscribe()
  }, [watch, onDraft])

  return (
    <form
      className="flex flex-col gap-5"
      data-event-form="MEETUP"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <EventTitleField register={register} errors={errors} />
      <EventOriginRow control={control} />

      <MomentRangeFields
        value={range}
        endError={rangeError ?? undefined}
        onChange={(next) => {
          onRangeChange(next)
          setRangeError(null)
        }}
      />

      <EventPlaceFields
        control={control}
        register={register}
        errors={errors}
        format={watch('format')}
      />

      <EventContactFields register={register} errors={errors} />

      {cover}

      <EventProseFields register={register} errors={errors} />

      {errors.root && (
        <p role="alert" className="text-copy text-destructive">
          {errors.root.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
