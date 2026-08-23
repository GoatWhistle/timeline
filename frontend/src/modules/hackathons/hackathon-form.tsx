import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { HackathonResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/lib/form'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

/** Значение datetime-local из ISO в системном представлении браузера. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/** Обратное преобразование: значение поля → UTC ISO для контракта. */
function toIso(local: string): string {
  return new Date(local).toISOString()
}

const schema = z
  .object({
    title: z.string().min(1, 'Укажите название').max(200),
    organizer: z.string().max(200).optional(),
    website_url: z
      .string()
      .optional()
      .refine((value) => !value || value.startsWith('https://'), {
        message: 'Ссылка должна начинаться с https://',
      }),
    description: z.string().optional(),
    notes: z.string().optional(),
    start_at: z.string().min(1, 'Укажите начало'),
    end_at: z.string().min(1, 'Укажите окончание'),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    path: ['end_at'],
    message: 'Окончание должно быть позже начала',
  })

export type HackathonFormValues = z.infer<typeof schema>

export type HackathonFormPayload = {
  title: string
  start_at: string
  end_at: string
  organizer?: string
  website_url?: string
  description?: string
  notes?: string
}

export function HackathonForm({
  hackathon,
  submitLabel,
  onSubmit,
}: {
  hackathon?: HackathonResponse
  submitLabel: string
  onSubmit: (payload: HackathonFormPayload) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HackathonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: hackathon?.title ?? '',
      organizer: hackathon?.organizer ?? '',
      website_url: hackathon?.website_url ?? '',
      description: hackathon?.description ?? '',
      notes: hackathon?.notes ?? '',
      start_at: toLocalInput(hackathon?.start_at),
      end_at: toLocalInput(hackathon?.end_at),
    },
  })

  async function submit(values: HackathonFormValues) {
    try {
      await onSubmit({
        title: values.title,
        start_at: toIso(values.start_at),
        end_at: toIso(values.end_at),
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
      <Field label="Название" htmlFor="title" error={errors.title?.message}>
        <Input id="title" aria-invalid={Boolean(errors.title)} {...register('title')} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Начало" htmlFor="start_at" error={errors.start_at?.message}>
          <Input
            id="start_at"
            type="datetime-local"
            aria-invalid={Boolean(errors.start_at)}
            {...register('start_at')}
          />
        </Field>
        <Field label="Окончание" htmlFor="end_at" error={errors.end_at?.message}>
          <Input
            id="end_at"
            type="datetime-local"
            aria-invalid={Boolean(errors.end_at)}
            {...register('end_at')}
          />
        </Field>
      </div>

      <Field label="Организатор" htmlFor="organizer" error={errors.organizer?.message}>
        <Input id="organizer" {...register('organizer')} />
      </Field>

      <Field
        label="Сайт"
        htmlFor="website_url"
        error={errors.website_url?.message}
        hint="Только https"
      >
        <Input id="website_url" {...register('website_url')} />
      </Field>

      <Field label="Описание" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" {...register('description')} />
      </Field>

      <Field
        label="Административные заметки"
        htmlFor="notes"
        error={errors.notes?.message}
        hint="Видны только администраторам"
      >
        <Textarea id="notes" {...register('notes')} />
      </Field>

      {errors.root && (
        <p role="alert" className="text-destructive text-sm">
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
