import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useLogin } from '@/entities/session/session.queries'
import { isApiError } from '@/shared/api/errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const schema = z.object({
  email: z.email('auth:validation.email'),
  password: z.string().min(1, 'auth:validation.passwordRequired'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { t } = useTranslation('auth')
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
      if (!isApiError(error)) throw error
      for (const field of error.fields) {
        if (field.field === 'email' || field.field === 'password') {
          setError(field.field, { message: field.message })
        }
      }
      if (error.fields.length === 0) {
        setError('root', { message: error.message })
      }
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
        <CardDescription>{t('common:app.name')}</CardDescription>
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
            {isSubmitting ? <Spinner label={t('login.pending')} /> : t('login.submit')}
          </Button>

          <div className="flex justify-between text-copy">
            <Link className="text-primary hover:underline" to="/forgot-password">
              {t('login.forgot')}
            </Link>
            <Link className="text-primary hover:underline" to="/register">
              {t('login.register')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
