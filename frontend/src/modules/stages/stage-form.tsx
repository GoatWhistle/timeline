import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { StageResponse, StageType } from '@/shared/api/types.gen'
import { STAGE_TYPE_LABEL, STAGE_TYPES } from '@/shared/lib/enums'
import { applyServerErrors } from '@/shared/lib/form'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const schema = z
  .object({
    name: z.string().min(1, 'Укажите название').max(120),
    type: z.enum(STAGE_TYPES as [StageType, ...StageType[]]),
    start_at: z.string().min(1, 'Укажите начало'),
    end_at: z.string().min(1, 'Укажите окончание'),
    sort_order: z.coerce.number().int().min(0),
    description: z.string().optional(),
    url: z
      .string()
      .optional()
      .refine((value) => !value || value.startsWith('https://'), {
        message: 'Ссылка должна начинаться с https://',
      }),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    path: ['end_at'],
    message: 'Окончание должно быть позже начала',
  })

type FormValues = z.input<typeof schema>

export type StagePayload = {
  name: string
  type: StageType
  start_at: string
  end_at: string
  sort_order: number
  description?: string
  url?: string
}

export function StageForm({
  stage,
  submitLabel,
  hackathonRange,
  onSubmit,
}: {
  stage?: StageResponse
  submitLabel: string
  hackathonRange?: { start_at: string; end_at: string }
  onSubmit: (payload: StagePayload) => Promise<void>
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stage?.name ?? '',
      type: stage?.type ?? 'PARTICIPATION',
      start_at: toLocalInput(stage?.start_at),
      end_at: toLocalInput(stage?.end_at),
      sort_order: stage?.sort_order ?? 0,
      description: stage?.description ?? '',
      url: stage?.url ?? '',
    },
  })

  const start = watch('start_at')
  const end = watch('end_at')

  // Выход этапа за период хакатона допустим: показываем предупреждение,
  // но не блокируем сохранение (раздел 5.2 ТЗ).
  const outOfRange =
    hackathonRange &&
    start &&
    end &&
    (new Date(start) < new Date(hackathonRange.start_at) ||
      new Date(end) > new Date(hackathonRange.end_at))

  async function submit(values: FormValues) {
    try {
      await onSubmit({
        name: values.name,
        type: values.type,
        start_at: new Date(values.start_at).toISOString(),
        end_at: new Date(values.end_at).toISOString(),
        sort_order: Number(values.sort_order),
        ...(values.description ? { description: values.description } : {}),
        ...(values.url ? { url: values.url } : {}),
      })
    } catch (error) {
      applyServerErrors(error, setError, [
        'name',
        'type',
        'start_at',
        'end_at',
        'description',
        'url',
      ])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Название" htmlFor="stage-name" error={errors.name?.message}>
        <Input id="stage-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
      </Field>

      <Field label="Тип этапа" htmlFor="stage-type" error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="stage-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {STAGE_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Начало" htmlFor="stage-start" error={errors.start_at?.message}>
          <Input id="stage-start" type="datetime-local" {...register('start_at')} />
        </Field>
        <Field label="Окончание" htmlFor="stage-end" error={errors.end_at?.message}>
          <Input id="stage-end" type="datetime-local" {...register('end_at')} />
        </Field>
      </div>

      {outOfRange && (
        <p className="rounded-md border border-dashed p-3 text-sm">
          Этап выходит за период хакатона. Это допустимо — сохранение не блокируется.
        </p>
      )}

      <Field label="Порядок сортировки" htmlFor="stage-sort" error={errors.sort_order?.message}>
        <Input id="stage-sort" type="number" min={0} {...register('sort_order')} />
      </Field>

      <Field label="Ссылка" htmlFor="stage-url" error={errors.url?.message} hint="Только https">
        <Input id="stage-url" {...register('url')} />
      </Field>

      <Field label="Описание" htmlFor="stage-description" error={errors.description?.message}>
        <Textarea id="stage-description" {...register('description')} />
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
