import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useResetPassword } from '@/entities/session/session.queries'
import { AuthExits } from '@/features/auth/door/auth-exits'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const resetSchema = z
  .object({
    password: z.string().min(8, 'auth:validation.passwordMin'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'auth:validation.passwordMismatch',
  })

type ResetValues = z.infer<typeof resetSchema>

export function PasswordResetConfirm() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const reset = useResetPassword()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', password_repeat: '' },
  })

  async function onSubmit(values: ResetValues) {
    try {
      await reset.mutateAsync({ token, password: values.password })
      toast.success(t('reset.changed'), { description: t('reset.changedHint') })
      navigate('/login', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['password'])
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('reset.noTokenTitle')}</CardTitle>
          <CardDescription>{t('reset.noTokenHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthExits
            exits={[
              { to: '/forgot-password', label: t('reset.requestNew') },
              { to: '/login', label: t('reset.backToLogin') },
            ]}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('reset.confirmTitle')}</CardTitle>
        <CardDescription>{t('reset.confirmHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label={t('field.newPassword')} htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>
          <Field
            label={t('field.repeatPassword')}
            htmlFor="password_repeat"
            error={errors.password_repeat?.message}
          >
            <PasswordInput
              id="password_repeat"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password_repeat)}
              {...register('password_repeat')}
            />
          </Field>
          {errors.root && (
            <p role="alert" className="text-destructive text-copy">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner label={t('reset.confirmPending')} />
            ) : (
              t('reset.confirmSubmit')
            )}
          </Button>

          <AuthExits exits={[{ to: '/login', label: t('reset.backToLogin') }]} />
        </form>
      </CardContent>
    </Card>
  )
}
