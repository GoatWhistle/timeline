import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { STAGE_TYPE_KEY, STAGE_TYPES } from '@/entities/stage/stage.labels'
import type { EventFormat, StageResponse, StageType } from '@/shared/api/types.gen'
import { civilFromIso, civilToIso } from '@/shared/datetime/civil'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { isAcceptedUrl, normalizeFormUrl } from '@/shared/forms/url'
import {
  endBeforeStart,
  type MomentRange,
  MomentRangeFields,
} from '@/shared/ui/forms/calendar/moment-range'
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

const schema = z.object({
  name: z.string().min(1, 'event:form.titleRequired').max(120),
  type: z.enum(STAGE_TYPES as [StageType, ...StageType[]]),
  sort_order: z.coerce.number().int().min(0),
  format: z.enum([INHERIT, ...STAGE_FORMATS] as [string, ...string[]]),
  country_code: z.string().optional(),
  city: z.string().optional(),
  venue: z.string().optional(),
  online_url: z
    .string()
    .optional()
    .refine((value) => !value || isAcceptedUrl(value), {
      message: 'event:form.urlInvalid',
    }),
  description: z.string().optional(),
  url: z
    .string()
    .optional()
    .refine((value) => !value || isAcceptedUrl(value), {
      message: 'event:form.urlInvalid',
    }),
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
  const [range, setRange] = useState<MomentRange>(() => ({
    start: civilFromIso(stage?.start_at),
    end: civilFromIso(stage?.end_at),
  }))
  const [rangeError, setRangeError] = useState<string | null>(null)
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

  const format = watch('format')

  const startAt = civilToIso(range.start)
  const endAt = civilToIso(range.end)
  const outOfRange =
    eventRange !== undefined &&
    startAt !== null &&
    endAt !== null &&
    (Date.parse(startAt) < Date.parse(eventRange.start_at) ||
      Date.parse(endAt) > Date.parse(eventRange.end_at))

  async function submit(values: FormValues) {
    if (startAt === null || endAt === null) {
      setRangeError('event:form.momentRequired')
      return
    }
    if (endBeforeStart(range)) {
      setRangeError('event:form.endAfterStart')
      return
    }
    setRangeError(null)
    try {
      await onSubmit({
        name: values.name,
        type: values.type,
        start_at: startAt,
        end_at: endAt,
        sort_order: Number(values.sort_order),
        ...(values.description ? { description: values.description } : {}),
        ...(values.url ? { url: normalizeFormUrl(values.url) ?? values.url } : {}),
        ...(values.format === INHERIT
          ? { clear_format: true }
          : { format: values.format as EventFormat }),
        ...(values.country_code ? { country_code: values.country_code } : {}),
        ...(values.city ? { city: values.city } : {}),
        ...(values.venue ? { venue: values.venue } : {}),
        ...(values.online_url
          ? { online_url: normalizeFormUrl(values.online_url) ?? values.online_url }
          : {}),
      })
    } catch (error) {
      applyServerErrors(error, setError, [
        'name',
        'type',
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

      <MomentRangeFields
        idPrefix="stage"
        value={range}
        endError={rangeError ?? undefined}
        onChange={(next) => {
          setRange(next)
          setRangeError(null)
        }}
      />

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
