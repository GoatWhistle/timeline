import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useChangeEmail } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const emailSchema = z.object({
  new_email: z.email('auth:validation.email'),
  password: z.string().min(1, 'common:profile.currentPasswordRequired'),
})
type EmailValues = z.infer<typeof emailSchema>

export function EmailChangeCard({ pendingEmail }: { pendingEmail?: string }) {
  const { t } = useTranslation()
  const changeEmail = useChangeEmail()
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: '', password: '' },
  })

  async function onChangeEmail(values: EmailValues) {
    try {
      await changeEmail.mutateAsync(values)
      emailForm.reset()
      toast.success(t('profile.emailSent'), {
        description: t('profile.emailSentHint'),
      })
    } catch (error) {
      applyServerErrors(error, emailForm.setError, ['new_email', 'password'])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.emailTitle')}</CardTitle>
        <CardDescription>{t('profile.emailHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingEmail && (
          <p className="mb-4 rounded-md border border-dashed p-3 text-copy">
            {t('profile.emailPending')} <strong>{pendingEmail}</strong>
          </p>
        )}
        <form
          className="flex flex-col gap-3"
          onSubmit={emailForm.handleSubmit(onChangeEmail)}
          noValidate
        >
          <Field
            label={t('profile.newEmail')}
            htmlFor="new_email"
            error={emailForm.formState.errors.new_email?.message}
          >
            <Input
              id="new_email"
              type="email"
              aria-invalid={Boolean(emailForm.formState.errors.new_email)}
              {...emailForm.register('new_email')}
            />
          </Field>
          <Field
            label={t('profile.currentPassword')}
            htmlFor="current_password"
            error={emailForm.formState.errors.password?.message}
          >
            <PasswordInput
              id="current_password"
              autoComplete="current-password"
              aria-invalid={Boolean(emailForm.formState.errors.password)}
              {...emailForm.register('password')}
            />
          </Field>
          {emailForm.formState.errors.root && (
            <p role="alert" className="text-destructive text-copy">
              {emailForm.formState.errors.root.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={emailForm.formState.isSubmitting}>
              {t('profile.sendConfirmation')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
