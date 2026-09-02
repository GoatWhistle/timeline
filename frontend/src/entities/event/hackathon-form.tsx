import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useEffect } from 'react'
import { type Control, type FieldErrors, type UseFormRegister, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { EventResponse } from '@/shared/api/types.gen'
import { type MomentRange, MomentRangeFields } from '@/shared/ui/forms/calendar/moment-range'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'
import {
  EventContactFields,
  EventOriginRow,
  EventProseFields,
  EventTitleField,
} from './event-common-fields'
import {
  buildHackathonPayload,
  type EventFormPayload,
  hackathonDefaults,
} from './event-form.payload'
import {
  HACKATHON_FIELD_NAMES,
  type HackathonFormValues,
  hackathonSchema,
  type MeetupFormValues,
} from './event-form.schema'
import { EventPlaceFields } from './event-place-fields'
import { EventPrizeFields } from './event-prize-fields'
import { useEventSubmit } from './use-event-submit'

export function HackathonForm({
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
  const { t } = useTranslation('event')

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HackathonFormValues>({
    resolver: zodResolver(hackathonSchema),
    defaultValues: { ...hackathonDefaults(event), ...draft },
  })

  const { rangeError, setRangeError, submit } = useEventSubmit<HackathonFormValues>({
    range,
    fieldNames: HACKATHON_FIELD_NAMES,
    build: buildHackathonPayload,
    setError,
    onSubmit,
  })

  useEffect(() => {
    if (!onDraft) return
    const subscription = watch((values) => onDraft(values as MeetupFormValues))
    return () => subscription.unsubscribe()
  }, [watch, onDraft])

  const commonControl = control as unknown as Control<MeetupFormValues>
  const commonRegister = register as unknown as UseFormRegister<MeetupFormValues>
  const commonErrors = errors as FieldErrors<MeetupFormValues>

  return (
    <form
      className="flex flex-col gap-5"
      data-event-form="HACKATHON"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <EventTitleField register={commonRegister} errors={commonErrors} />
      <EventOriginRow control={commonControl} />

      <MomentRangeFields
        value={range}
        endError={rangeError ?? undefined}
        onChange={(next) => {
          onRangeChange(next)
          setRangeError(null)
        }}
      />

      <EventPlaceFields
        control={commonControl}
        register={commonRegister}
        errors={commonErrors}
        format={watch('format')}
        side={
          <Field label={t('form.track')} htmlFor="event-track" error={errors.track?.message}>
            <Input id="event-track" {...register('track')} />
          </Field>
        }
      />

      <EventPrizeFields control={control} register={register} errors={errors} />

      <EventContactFields register={commonRegister} errors={commonErrors} />

      {cover}

      <EventProseFields register={commonRegister} errors={commonErrors} />

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
