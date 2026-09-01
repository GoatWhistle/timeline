import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCreateProfileLink } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'
import { Button } from '@/shared/ui/primitives/button'
import { type NewLinkValues, newLinkSchema } from './links-schema'

export function AddProfileLink({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const create = useCreateProfileLink()
  const form = useForm<NewLinkValues>({
    resolver: zodResolver(newLinkSchema),
    defaultValues: { url: '', label: '' },
  })

  const url = form.watch('url')
  const detected = serviceLabel(url)

  async function onSubmit(values: NewLinkValues) {
    try {
      await create.mutateAsync({
        url: values.url,
        ...(values.label === '' ? {} : { label: values.label }),
      })
      form.reset({ url: '', label: '' })
      toast.success(t('profile.links.added'))
    } catch (error) {
      applyServerErrors(error, form.setError, ['url', 'label'])
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field
        label={t('profile.links.url')}
        hint={t('profile.links.urlHint')}
        htmlFor="new-link-url"
        error={form.formState.errors.url?.message}
      >
        <div className="flex items-center gap-2">
          <ServiceIcon href={url} className="text-muted-foreground" />
          <Input
            id="new-link-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={t('profile.links.urlPlaceholder')}
            aria-invalid={Boolean(form.formState.errors.url)}
            aria-describedby="new-link-detected"
            {...form.register('url')}
          />
        </div>
        <p id="new-link-detected" className="mt-1 text-meta text-muted-foreground">
          {detected === null
            ? t('profile.links.detectedNone')
            : t('profile.links.detected', { name: detected })}
        </p>
      </Field>

      <Field
        label={t('profile.links.label')}
        hint={t('profile.links.labelHint')}
        htmlFor="new-link-label"
        error={form.formState.errors.label?.message}
      >
        <Input
          id="new-link-label"
          autoComplete="off"
          maxLength={100}
          aria-invalid={Boolean(form.formState.errors.label)}
          {...form.register('label')}
        />
      </Field>

      <div className="flex flex-col items-end">
        <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
          {t('profile.links.add')}
        </Button>
        {disabled && (
          <p className="mt-1 text-meta text-muted-foreground">{t('profile.links.limitReached')}</p>
        )}
      </div>
    </form>
  )
}
