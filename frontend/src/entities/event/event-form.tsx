import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { EventResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import {
  endBeforeStart,
  type MomentRange,
  MomentRangeFields,
} from '@/shared/ui/forms/calendar/moment-range'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'
import {
  buildPayload,
  defaultRange,
  defaultValues,
  type EventFormPayload,
  momentServerError,
} from './event-form.payload'
import { EVENT_FIELD_NAMES, type EventFormValues, eventSchema } from './event-form.schema'
import { EventPlaceFields } from './event-place-fields'
import { EventPrizeFields } from './event-prize-fields'
import { EventTaxonomyFields } from './event-taxonomy-fields'

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
  const { t } = useTranslation('event')
  const [range, setRange] = useState<MomentRange>(() => defaultRange(event))
  const [rangeError, setRangeError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaultValues(event),
  })

  const format = watch('format')

  async function submit(values: EventFormValues) {
    const payload = buildPayload(values, range)
    if (payload === null) {
      setRangeError('event:form.momentRequired')
      return
    }
    if (endBeforeStart(range)) {
      setRangeError('event:form.endAfterStart')
      return
    }
    setRangeError(null)
    try {
      await onSubmit(payload)
    } catch (error) {
      const fromServer = momentServerError(error)
      if (fromServer !== null) setRangeError(fromServer)
      applyServerErrors(error, setError, EVENT_FIELD_NAMES)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(submit)} noValidate>
      <Field label={t('form.title')} htmlFor="event-title" error={errors.title?.message} required>
        <Input id="event-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
      </Field>

      <Controller
        control={control}
        name="kind"
        render={({ field: kindField }) => (
          <Controller
            control={control}
            name="origin"
            render={({ field: originField }) => (
              <EventTaxonomyFields
                kind={kindField.value}
                origin={originField.value}
                onKind={kindField.onChange}
                onOrigin={originField.onChange}
              />
            )}
          />
        )}
      />

      <MomentRangeFields
        value={range}
        endError={rangeError ?? undefined}
        onChange={(next) => {
          setRange(next)
          setRangeError(null)
        }}
      />

      <EventPlaceFields control={control} register={register} errors={errors} format={format} />

      <EventPrizeFields register={register} errors={errors} />

      <Field
        label={t('form.organizer')}
        htmlFor="event-organizer"
        error={errors.organizer?.message}
      >
        <Input id="event-organizer" {...register('organizer')} />
      </Field>

      <Field
        label={t('form.website')}
        htmlFor="event-website"
        error={errors.website_url?.message}
        hint={t('form.websiteHint')}
      >
        <Input id="event-website" inputMode="url" {...register('website_url')} />
      </Field>

      {cover}

      <Field
        label={t('form.description')}
        htmlFor="event-description"
        error={errors.description?.message}
      >
        <Textarea id="event-description" {...register('description')} />
      </Field>

      <Field
        label={t('form.adminNotes')}
        htmlFor="event-notes"
        error={errors.notes?.message}
        hint={t('form.adminNotesHint')}
      >
        <Textarea id="event-notes" {...register('notes')} />
      </Field>

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
