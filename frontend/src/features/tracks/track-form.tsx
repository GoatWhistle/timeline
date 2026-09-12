import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { isApiError } from '@/shared/api/errors'
import type { EventTrackResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { MARKDOWN_MAX_LENGTH } from '@/shared/markdown/limits'
import { MarkdownEditor } from '@/shared/markdown/markdown-editor'
import { formatMoney } from '@/shared/money/money'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'
import { draftTotal, type PrizeDraft, TrackPrizeFields } from './track-prize-fields'

const schema = z.object({
  name: z.string().min(1, 'event:tracks.nameRequired').max(120),
  description: z.string().max(MARKDOWN_MAX_LENGTH).optional(),
})

type FormValues = z.input<typeof schema>

export type TrackPayload = {
  name: string
  description?: string
  prizes: { place?: number; title?: string; amount: string }[]
}

function toDrafts(track: EventTrackResponse | undefined): PrizeDraft[] {
  return (track?.prizes ?? []).map((prize) => ({
    ...(prize.place === undefined ? {} : { place: prize.place }),
    ...(prize.title === undefined ? {} : { title: prize.title }),
    amount: prize.amount,
  }))
}

export function TrackForm({
  track,
  currency,
  headroom,
  submitLabel,
  onSubmit,
}: {
  track?: EventTrackResponse
  currency: string | undefined
  headroom: number | null
  submitLabel: string
  onSubmit: (payload: TrackPayload) => Promise<void>
}) {
  const { t } = useTranslation('event')
  const [prizes, setPrizes] = useState<PrizeDraft[]>(() => toDrafts(track))
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: track?.name ?? '', description: track?.description ?? '' },
  })

  const idPrefix = track ? `track-edit-${track.id}` : 'track-new'
  const total = draftTotal(prizes)
  const overBudget = headroom !== null && total > headroom

  async function submit(values: FormValues) {
    try {
      await onSubmit({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
        prizes: prizes
          .filter((prize) => prize.amount !== '')
          .map((prize) => ({
            ...(prize.place === undefined ? {} : { place: prize.place }),
            ...(prize.title === undefined ? {} : { title: prize.title.trim() }),
            amount: prize.amount,
          })),
      })
    } catch (error) {
      if (isApiError(error) && error.fields.some((field) => field.field === 'prizes')) {
        setError('root', {
          message: t(headroom === null ? 'tracks.noPool' : 'tracks.overBudgetServer'),
        })
        return
      }
      applyServerErrors(error, setError, ['name', 'description'])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field label={t('tracks.formName')} htmlFor={`${idPrefix}-name`} error={errors.name?.message}>
        <Input id={`${idPrefix}-name`} {...register('name')} />
      </Field>

      <Field
        label={t('tracks.formDescription')}
        htmlFor={`${idPrefix}-description`}
        error={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <MarkdownEditor
              id={`${idPrefix}-description`}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={4}
            />
          )}
        />
      </Field>

      <TrackPrizeFields
        prizes={prizes}
        currency={currency}
        idPrefix={idPrefix}
        onChange={setPrizes}
      />

      {overBudget && (
        <p role="alert" className="text-caption text-destructive">
          {t('tracks.overBudget', {
            over: formatMoney(String(total - headroom), currency) ?? total - headroom,
          })}
        </p>
      )}

      {errors.root && (
        <p role="alert" className="text-copy text-destructive">
          {errors.root.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || overBudget}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
