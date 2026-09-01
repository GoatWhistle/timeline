import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRenameSession } from '@/entities/session/device-sessions.queries'
import type { SessionResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'
import { type RenameDeviceValues, renameDeviceSchema } from './rename-schema'

export function RenameDevice({
  session,
  onDone,
}: {
  session: SessionResponse
  onDone: () => void
}) {
  const { t } = useTranslation()
  const rename = useRenameSession()
  const current = session.label ?? ''
  const form = useForm<RenameDeviceValues>({
    resolver: zodResolver(renameDeviceSchema),
    defaultValues: { label: current },
  })

  const nameId = `rename-session-${session.id}`

  async function onSubmit(values: RenameDeviceValues) {
    const cleared = values.label === '' && current !== ''
    if (values.label === '' && current === '') {
      onDone()
      return
    }
    try {
      await rename.mutateAsync({
        id: session.id,
        body: cleared ? { clear_label: true } : { label: values.label },
      })
      toast.success(t('devices.renamed'))
      onDone()
    } catch (error) {
      applyServerErrors(error, form.setError, ['label'])
      toast.error(t('devices.renameFailed'))
    }
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border bg-card p-3"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <Field
        label={t('devices.nameLabel')}
        hint={t('devices.renameHint')}
        htmlFor={nameId}
        error={form.formState.errors.label?.message}
      >
        <Input
          id={nameId}
          autoComplete="off"
          maxLength={64}
          placeholder={t('devices.namePlaceholder')}
          aria-invalid={Boolean(form.formState.errors.label)}
          {...form.register('label')}
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        {current === '' ? null : (
          <Button
            type="button"
            variant="ghost"
            disabled={form.formState.isSubmitting}
            onClick={() => form.setValue('label', '', { shouldDirty: true })}
          >
            {t('devices.clearName')}
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
