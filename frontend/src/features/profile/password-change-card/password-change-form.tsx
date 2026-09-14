import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useChangePassword } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { DialogFooter } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'common:profile.currentPasswordRequired'),
    new_password: z.string().min(8, 'auth:validation.passwordMin'),
    new_password_repeat: z.string(),
  })
  .refine((values) => values.new_password === values.new_password_repeat, {
    path: ['new_password_repeat'],
    message: 'auth:validation.passwordMismatch',
  })
type PasswordValues = z.infer<typeof passwordSchema>

export function PasswordChangeForm({
  onChanged,
  onCancel,
}: {
  onChanged: () => void
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const changePassword = useChangePassword()
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', new_password_repeat: '' },
  })

  async function onChangePassword(values: PasswordValues) {
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      passwordForm.reset()
      toast.success(t('profile.passwordChanged'), { description: t('profile.passwordChangedHint') })
      onChanged()
    } catch (error) {
      applyServerErrors(error, passwordForm.setError, [
        'current_password',
        'new_password',
        'new_password_repeat',
      ])
    }
  }

  const errors = passwordForm.formState.errors

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={passwordForm.handleSubmit(onChangePassword)}
      noValidate
    >
      <Field
        label={t('profile.currentPassword')}
        htmlFor="current_password"
        error={errors.current_password?.message}
      >
        <PasswordInput
          id="current_password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.current_password)}
          {...passwordForm.register('current_password')}
        />
      </Field>
      <Field
        label={t('auth:field.newPassword')}
        htmlFor="new_password"
        error={errors.new_password?.message}
      >
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.new_password)}
          {...passwordForm.register('new_password')}
        />
      </Field>
      <Field
        label={t('auth:field.repeatPassword')}
        htmlFor="new_password_repeat"
        error={errors.new_password_repeat?.message}
      >
        <PasswordInput
          id="new_password_repeat"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.new_password_repeat)}
          {...passwordForm.register('new_password_repeat')}
        />
      </Field>
      {errors.root && (
        <p role="alert" className="text-destructive text-copy">
          {errors.root.message}
        </p>
      )}
      <DialogFooter>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('action.cancel')}
          </Button>
        ) : null}
        <Button type="submit" variant="destructive" disabled={passwordForm.formState.isSubmitting}>
          {t('profile.changePassword')}
        </Button>
      </DialogFooter>
    </form>
  )
}
