import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfileLink } from '@/entities/user/profile.queries'
import type { ProfileLink } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'
import { Button } from '@/shared/ui/primitives/button'
import { type NewLinkValues, newLinkSchema } from './links-schema'

export function EditProfileLink({ link, onDone }: { link: ProfileLink; onDone: () => void }) {
  const { t } = useTranslation()
  const update = useUpdateProfileLink()
  const form = useForm<NewLinkValues>({
    resolver: zodResolver(newLinkSchema),
    defaultValues: { url: link.url, label: link.label ?? '' },
  })

  const url = form.watch('url')
  const detected = serviceLabel(url)
  const urlId = `edit-link-url-${link.id}`
  const labelId = `edit-link-label-${link.id}`

  async function onSubmit(values: NewLinkValues) {
    const cleared = values.label === '' && (link.label ?? '') !== ''
    try {
      await update.mutateAsync({
        id: link.id,
        body: {
          url: values.url,
          ...(cleared ? { clear_label: true } : {}),
          ...(values.label === '' ? {} : { label: values.label }),
        },
      })
      toast.success(t('profile.links.saved'))
      onDone()
    } catch (error) {
      applyServerErrors(error, form.setError, ['url', 'label'])
      toast.error(t('profile.links.saveFailed'))
    }
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border bg-card p-3"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <Field
        label={t('profile.links.url')}
        htmlFor={urlId}
        error={form.formState.errors.url?.message}
      >
        <div className="flex items-center gap-2">
          <ServiceIcon href={url} className="text-muted-foreground" />
          <Input
            id={urlId}
            type="url"
            inputMode="url"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.url)}
            {...form.register('url')}
          />
        </div>
        <p className="mt-1 text-meta text-muted-foreground">
          {detected === null
            ? t('profile.links.detectedNone')
            : t('profile.links.detected', { name: detected })}
        </p>
      </Field>

      <Field
        label={t('profile.links.label')}
        hint={t('profile.links.labelHint')}
        htmlFor={labelId}
        error={form.formState.errors.label?.message}
      >
        <Input
          id={labelId}
          autoComplete="off"
          maxLength={100}
          aria-invalid={Boolean(form.formState.errors.label)}
          {...form.register('label')}
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        {(link.label ?? '') === '' ? null : (
          <Button
            type="button"
            variant="ghost"
            disabled={form.formState.isSubmitting}
            onClick={() => form.setValue('label', '', { shouldDirty: true })}
          >
            {t('profile.links.clearLabel')}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t('action.save')}
        </Button>
      </div>
    </form>
  )
}
