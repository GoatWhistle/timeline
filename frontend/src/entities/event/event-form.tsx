import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type { EventKind, EventOrigin, EventResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'
import { EventTaxonomyFields } from './event-taxonomy-fields'

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(local: string): string {
  return new Date(local).toISOString()
}

const schema = z
  .object({
    title: z.string().min(1, 'event:form.titleRequired').max(200),
    organizer: z.string().max(200).optional(),
    website_url: z
      .string()
      .optional()
      .refine((value) => !value || value.startsWith('https://'), {
        message: 'event:form.urlHttps',
      }),
    description: z.string().optional(),
    notes: z.string().optional(),
    start_at: z.string().min(1, 'event:form.startRequired'),
    end_at: z.string().min(1, 'event:form.endRequired'),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    path: ['end_at'],
    message: 'event:form.endAfterStart',
  })

export type EventFormValues = z.infer<typeof schema>

export type EventFormPayload = {
  title: string
  start_at: string
  end_at: string
  kind: EventKind
  origin: EventOrigin
  organizer?: string
  website_url?: string
  description?: string
  notes?: string
}

export function EventForm({
  event,
  submitLabel,
  onSubmit,
}: {
  event?: EventResponse
  submitLabel: string
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const { t } = useTranslation('event')
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'HACKATHON')
  const [origin, setOrigin] = useState<EventOrigin>(event?.origin ?? 'RU')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      organizer: event?.organizer ?? '',
      website_url: event?.website_url ?? '',
      description: event?.description ?? '',
      notes: event?.notes ?? '',
      start_at: toLocalInput(event?.start_at),
      end_at: toLocalInput(event?.end_at),
    },
  })

  async function submit(values: EventFormValues) {
    try {
      await onSubmit({
        title: values.title,
        start_at: toIso(values.start_at),
        end_at: toIso(values.end_at),
        kind,
        origin,
        ...(values.organizer ? { organizer: values.organizer } : {}),
        ...(values.website_url ? { website_url: values.website_url } : {}),
        ...(values.description ? { description: values.description } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
    } catch (error) {
      applyServerErrors(error, setError, [
        'title',
        'organizer',
        'website_url',
        'description',
        'notes',
        'start_at',
        'end_at',
      ])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field label={t('form.title')} htmlFor="title" error={errors.title?.message}>
        <Input id="title" aria-invalid={Boolean(errors.title)} {...register('title')} />
      </Field>

      <EventTaxonomyFields kind={kind} origin={origin} onKind={setKind} onOrigin={setOrigin} />

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('form.start')} htmlFor="start_at" error={errors.start_at?.message}>
          <Input
            id="start_at"
            type="datetime-local"
            aria-invalid={Boolean(errors.start_at)}
            {...register('start_at')}
          />
        </Field>
        <Field label={t('form.end')} htmlFor="end_at" error={errors.end_at?.message}>
          <Input
            id="end_at"
            type="datetime-local"
            aria-invalid={Boolean(errors.end_at)}
            {...register('end_at')}
          />
        </Field>
      </div>

      <Field label={t('form.organizer')} htmlFor="organizer" error={errors.organizer?.message}>
        <Input id="organizer" {...register('organizer')} />
      </Field>

      <Field
        label={t('form.website')}
        htmlFor="website_url"
        error={errors.website_url?.message}
        hint={t('form.httpsOnly')}
      >
        <Input id="website_url" {...register('website_url')} />
      </Field>

      <Field
        label={t('form.description')}
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea id="description" {...register('description')} />
      </Field>

      <Field
        label={t('form.adminNotes')}
        htmlFor="notes"
        error={errors.notes?.message}
        hint={t('form.adminNotesHint')}
      >
        <Textarea id="notes" {...register('notes')} />
      </Field>

      {errors.root && (
        <p role="alert" className="text-destructive text-copy">
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
