import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { SuggestInput } from '@/shared/ui/forms/suggest-input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { organizerSuggestionsQuery } from './event.queries'
import type { MeetupFormValues } from './event-form.schema'
import { EventOriginField } from './event-taxonomy-fields'

function OrganizerField({
  register,
  error,
  onPick,
}: {
  register: UseFormRegister<MeetupFormValues>
  error?: string | undefined
  onPick: (value: string) => void
}) {
  const { t } = useTranslation('event')
  const [typed, setTyped] = useState('')
  const search = useDebouncedValue(typed, 250)
  const { data } = useQuery(organizerSuggestionsQuery(search))
  const field = register('organizer')

  const suggestions = (data?.items ?? []).filter(
    (name) => name.toLowerCase() !== typed.trim().toLowerCase(),
  )

  return (
    <Field label={t('form.organizer')} htmlFor="event-organizer" error={error}>
      <SuggestInput
        id="event-organizer"
        suggestions={suggestions}
        onPick={onPick}
        {...field}
        onChange={(event) => {
          void field.onChange(event)
          setTyped(event.target.value)
        }}
      />
    </Field>
  )
}

export function EventOriginRow({ control }: { control: Control<MeetupFormValues> }) {
  return (
    <Controller
      control={control}
      name="origin"
      render={({ field }) => <EventOriginField value={field.value} onChange={field.onChange} />}
    />
  )
}

export function EventBasicsFields({
  register,
  errors,
  onOrganizerPick,
}: {
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
  onOrganizerPick: (value: string) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-4">
      <Field label={t('form.title')} htmlFor="event-title" error={errors.title?.message} required>
        <Input id="event-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
      </Field>

      <OrganizerField
        register={register}
        error={errors.organizer?.message}
        onPick={onOrganizerPick}
      />

      <Field label={t('form.website')} htmlFor="event-website" error={errors.website_url?.message}>
        <Input id="event-website" inputMode="url" {...register('website_url')} />
      </Field>

      <Field
        label={t('form.description')}
        htmlFor="event-description"
        error={errors.description?.message}
      >
        <Textarea id="event-description" rows={4} {...register('description')} />
      </Field>
    </div>
  )
}
