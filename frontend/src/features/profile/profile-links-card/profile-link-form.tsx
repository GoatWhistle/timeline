import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { cn } from '@/shared/styling/class-names/class-names'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'
import { Button } from '@/shared/ui/primitives/button'
import { type NewLinkValues, newLinkSchema } from './links-schema'

export type ProfileLinkFormProps = {
  idPrefix: string
  initial: NewLinkValues
  submitLabel: string
  submitDisabled?: boolean
  footnote?: string | undefined
  clearOnSubmit?: boolean
  onSubmit: (values: NewLinkValues) => Promise<void>
  canClearLabel?: boolean
  onCancel?: (() => void) | undefined
}

const EMPTY: NewLinkValues = { url: '', label: '' }

export function ProfileLinkForm({
  idPrefix,
  initial,
  submitLabel,
  submitDisabled = false,
  footnote,
  clearOnSubmit = false,
  canClearLabel = false,
  onSubmit,
  onCancel,
}: ProfileLinkFormProps) {
  const { t } = useTranslation()
  const form = useForm<NewLinkValues>({
    resolver: zodResolver(newLinkSchema),
    defaultValues: initial,
  })

  const url = form.watch('url')
  const detected = serviceLabel(url)
  const urlId = `${idPrefix}-url`
  const labelId = `${idPrefix}-label`
  const detectedId = `${idPrefix}-detected`

  async function submit(values: NewLinkValues) {
    try {
      await onSubmit(values)
      form.reset(clearOnSubmit ? EMPTY : values)
    } catch (error) {
      applyServerErrors(error, form.setError, ['url', 'label'])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Field
          label={t('profile.links.url')}
          htmlFor={urlId}
          className="min-w-0 sm:flex-2"
          error={form.formState.errors.url?.message}
        >
          <div className="relative">
            <Input
              id={urlId}
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={t('profile.links.urlPlaceholder')}
              aria-invalid={Boolean(form.formState.errors.url)}
              aria-describedby={detectedId}
              className="pr-9"
              {...form.register('url')}
            />
            <ServiceIcon
              href={url}
              className={cn(
                '-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 text-muted-foreground',
                'transition-colors duration-base ease-out',
                detected !== null && 'text-foreground',
              )}
            />
          </div>
        </Field>

        <Field
          label={t('profile.links.label')}
          htmlFor={labelId}
          className="min-w-0 sm:flex-1"
          error={form.formState.errors.label?.message}
        >
          <Input
            id={labelId}
            autoComplete="off"
            maxLength={100}
            placeholder={detected ?? ''}
            aria-invalid={Boolean(form.formState.errors.label)}
            {...form.register('label')}
          />
        </Field>
      </div>

      <p
        id={detectedId}
        aria-live="polite"
        className="text-meta text-muted-foreground empty:hidden"
      >
        {detected === null ? '' : t('profile.links.detected', { name: detected })}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {footnote !== undefined && footnote !== '' && (
          <p className="mr-auto text-meta text-muted-foreground">{footnote}</p>
        )}
        {canClearLabel && (
          <Button
            type="button"
            variant="ghost"
            disabled={form.formState.isSubmitting}
            onClick={() => form.setValue('label', '', { shouldDirty: true })}
          >
            {t('profile.links.clearLabel')}
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('action.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled || form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
