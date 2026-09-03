import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import type { MeetupFormValues } from './event-form.schema'
import { EventOriginField } from './event-taxonomy-fields'

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
}: {
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-5">
      <Field label={t('form.title')} htmlFor="event-title" error={errors.title?.message} required>
        <Input id="event-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
      </Field>

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
