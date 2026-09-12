import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useLogin } from '@/entities/session/session.queries'
import { AuthExits } from '@/features/auth/door/auth-exits'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { Button } from '@/shared/ui/primitives/button'

const schema = z.object({
  email: z.email('auth:validation.email'),
  password: z.string().min(1, 'auth:validation.passwordRequired'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  async function onSubmit(values: FormValues) {
    try {
      await login.mutateAsync(values)
      navigate(from, { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['email', 'password'])
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <CrossfadeSwap swapKey={i18n.language}>{t('login.title')}</CrossfadeSwap>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </Field>

          <Field label={t('field.password')} htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
          </Field>

          {errors.root && (
            <p role="alert" className="text-destructive text-copy">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner label={t('login.pending')} />
            ) : (
              <CrossfadeSwap swapKey={i18n.language}>{t('login.submit')}</CrossfadeSwap>
            )}
          </Button>

          <AuthExits
            exits={[
              { to: '/forgot-password', label: t('login.forgot') },
              { to: '/register', label: t('login.register') },
            ]}
          />
        </form>
      </CardContent>
    </Card>
  )
}
