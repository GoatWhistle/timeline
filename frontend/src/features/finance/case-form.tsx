import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type { EventCaseResponse, FinanceTrack } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { MARKDOWN_MAX_LENGTH } from '@/shared/markdown/limits'
import { MarkdownEditor } from '@/shared/markdown/markdown-editor'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

const NO_TRACK = 'none'

const schema = z.object({
  name: z.string().trim().min(1, 'event:cases.nameRequired').max(200),
  description: z.string().max(MARKDOWN_MAX_LENGTH).optional(),
  partner: z.string().max(200).optional(),
  prize_amount: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || value === '' || /^\d+$/.test(value.trim()),
      'event:cases.prizeWhole',
    ),
  track_id: z.string().optional(),
})

type FormValues = z.input<typeof schema>

export type CaseFormPayload = {
  name: string
  description?: string
  partner?: string
  prize_amount?: string
  track_id?: string
  clear_track?: boolean
  clear_prize?: boolean
}

export function CaseForm({
  item,
  tracks,
  submitLabel,
  onSubmit,
}: {
  item?: EventCaseResponse
  tracks: FinanceTrack[]
  submitLabel: string
  onSubmit: (payload: CaseFormPayload) => Promise<void>
}) {
  const { t } = useTranslation('event')
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      partner: item?.partner ?? '',
      prize_amount: item?.prize_amount ?? '',
      track_id: item?.track_id ?? NO_TRACK,
    },
  })

  const idPrefix = item ? `case-edit-${item.id}` : 'case-new'
  const clearable = item !== undefined

  async function submit(values: FormValues) {
    const prize = values.prize_amount?.trim() ?? ''
    const partner = values.partner?.trim() ?? ''
    const track = values.track_id ?? NO_TRACK
    try {
      await onSubmit({
        name: values.name.trim(),
        ...(values.description ? { description: values.description } : {}),
        ...(partner === '' ? {} : { partner }),
        ...(prize === '' ? {} : { prize_amount: prize }),
        ...(track === NO_TRACK ? {} : { track_id: track }),
        ...(clearable ? { clear_track: track === NO_TRACK, clear_prize: prize === '' } : {}),
      })
    } catch (error) {
      applyServerErrors(error, setError, ['name', 'description', 'partner', 'prize_amount'])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field label={t('cases.formName')} htmlFor={`${idPrefix}-name`} error={errors.name?.message}>
        <Input id={`${idPrefix}-name`} {...register('name')} />
      </Field>

      <Field
        label={t('cases.formPartner')}
        htmlFor={`${idPrefix}-partner`}
        error={errors.partner?.message}
      >
        <Input id={`${idPrefix}-partner`} {...register('partner')} />
      </Field>

      <Field
        label={t('cases.formPrize')}
        htmlFor={`${idPrefix}-prize`}
        error={errors.prize_amount?.message}
        hint={t('cases.formPrizeHint')}
      >
        <Input id={`${idPrefix}-prize`} inputMode="numeric" {...register('prize_amount')} />
      </Field>

      <Field label={t('cases.formTrack')} htmlFor={`${idPrefix}-track`}>
        <Controller
          control={control}
          name="track_id"
          render={({ field }) => (
            <Select value={field.value ?? NO_TRACK} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-track`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRACK}>{t('cases.noTrack')}</SelectItem>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t('cases.formDescription')}
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
