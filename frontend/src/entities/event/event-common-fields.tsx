import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import type { MeetupFormValues } from './event-form.schema'
import { EventOriginField } from './event-taxonomy-fields'

export function EventTitleField({
  register,
  errors,
}: {
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
}) {
  const { t } = useTranslation('event')
  return (
    <Field label={t('form.title')} htmlFor="event-title" error={errors.title?.message} required>
      <Input id="event-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
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

export function EventContactFields({
  register,
  errors,
}: {
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
}) {
  const { t } = useTranslation('event')
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={t('form.organizer')}
        htmlFor="event-organizer"
        error={errors.organizer?.message}
      >
        <Input id="event-organizer" {...register('organizer')} />
      </Field>
      <Field label={t('form.website')} htmlFor="event-website" error={errors.website_url?.message}>
        <Input id="event-website" inputMode="url" {...register('website_url')} />
      </Field>
    </div>
  )
}

export function EventProseFields({
  register,
  errors,
}: {
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
}) {
  const { t } = useTranslation('event')
  return (
    <>
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
    </>
  )
}
