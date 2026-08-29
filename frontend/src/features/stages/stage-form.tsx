import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { STAGE_TYPE_KEY, STAGE_TYPES } from '@/entities/stage/stage.labels'
import type { EventFormat, StageResponse, StageType } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'
import { INHERIT, STAGE_FORMATS, StagePlaceFields } from './stage-place-fields'

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const schema = z
  .object({
    name: z.string().min(1, 'event:form.titleRequired').max(120),
    type: z.enum(STAGE_TYPES as [StageType, ...StageType[]]),
    start_at: z.string().min(1, 'event:form.startRequired'),
    end_at: z.string().min(1, 'event:form.endRequired'),
    sort_order: z.coerce.number().int().min(0),
    format: z.enum([INHERIT, ...STAGE_FORMATS] as [string, ...string[]]),
    country_code: z.string().optional(),
    city: z.string().optional(),
    venue: z.string().optional(),
    online_url: z
      .string()
      .optional()
      .refine((value) => !value || value.startsWith('https://'), {
        message: 'event:form.urlHttps',
      }),
    description: z.string().optional(),
    url: z
      .string()
      .optional()
      .refine((value) => !value || value.startsWith('https://'), {
        message: 'event:form.urlHttps',
      }),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    path: ['end_at'],
    message: 'event:form.endAfterStart',
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
  format?: EventFormat
  clear_format?: boolean
  country_code?: string
  city?: string
  venue?: string
  online_url?: string
}

export function StageForm({
  stage,
  submitLabel,
  eventRange,
  onSubmit,
}: {
  stage?: StageResponse
  submitLabel: string
  eventRange?: { start_at: string; end_at: string }
  onSubmit: (payload: StagePayload) => Promise<void>
}) {
  const { t } = useTranslation('event')
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
      format: stage?.format ?? INHERIT,
      country_code: stage?.country_code ?? '',
      city: stage?.city ?? '',
      venue: stage?.venue ?? '',
      online_url: stage?.online_url ?? '',
      description: stage?.description ?? '',
      url: stage?.url ?? '',
    },
  })

  const start = watch('start_at')
  const end = watch('end_at')
  const format = watch('format')

  const outOfRange =
    eventRange &&
    start &&
    end &&
    (new Date(start) < new Date(eventRange.start_at) || new Date(end) > new Date(eventRange.end_at))

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
        ...(values.format === INHERIT
          ? { clear_format: true }
          : { format: values.format as EventFormat }),
        ...(values.country_code ? { country_code: values.country_code } : {}),
        ...(values.city ? { city: values.city } : {}),
        ...(values.venue ? { venue: values.venue } : {}),
        ...(values.online_url ? { online_url: values.online_url } : {}),
      })
    } catch (error) {
      applyServerErrors(error, setError, [
        'name',
        'type',
        'start_at',
        'end_at',
        'description',
        'url',
        'format',
        'country_code',
        'city',
        'venue',
        'online_url',
      ])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field label={t('stages.formName')} htmlFor="stage-name" error={errors.name?.message}>
        <Input id="stage-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
      </Field>

      <Field label={t('stages.formType')} htmlFor="stage-type" error={errors.type?.message}>
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
                    {t(STAGE_TYPE_KEY[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('stages.formStart')} htmlFor="stage-start" error={errors.start_at?.message}>
          <Input id="stage-start" type="datetime-local" {...register('start_at')} />
        </Field>
        <Field label={t('stages.formEnd')} htmlFor="stage-end" error={errors.end_at?.message}>
          <Input id="stage-end" type="datetime-local" {...register('end_at')} />
        </Field>
      </div>

      {outOfRange && (
        <p className="rounded-md border border-dashed p-3 text-copy">{t('stages.outOfRange')}</p>
      )}

      <Field
        label={t('stages.formSortOrder')}
        htmlFor="stage-sort"
        error={errors.sort_order?.message}
      >
        <Input id="stage-sort" type="number" min={0} {...register('sort_order')} />
      </Field>

      <Field
        label={t('stages.formUrl')}
        htmlFor="stage-url"
        error={errors.url?.message}
        hint={t('form.httpsOnly')}
      >
        <Input id="stage-url" {...register('url')} />
      </Field>

      <StagePlaceFields control={control} register={register} errors={errors} format={format} />

      <Field
        label={t('stages.formDescription')}
        htmlFor="stage-description"
        error={errors.description?.message}
      >
        <Textarea id="stage-description" {...register('description')} />
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
