import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { z } from 'zod'
import { useForgotPassword } from '@/entities/session/session.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const forgotSchema = z.object({ email: z.email('auth:validation.email') })
type ForgotValues = z.infer<typeof forgotSchema>

export function PasswordResetRequest() {
  const { t } = useTranslation('auth')
  const forgot = useForgotPassword()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  async function onSubmit(values: ForgotValues) {
    try {
      await forgot.mutateAsync(values)
    } catch (error) {
      applyServerErrors(error, setError, ['email'])
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('reset.requestTitle')}</CardTitle>
        <CardDescription>{t('reset.requestHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isSubmitSuccessful && !errors.root ? (
          <div className="flex flex-col gap-4">
            <p className="text-copy">{t('reset.requestSent')}</p>
            <Button asChild variant="outline">
              <Link to="/login">{t('reset.backToLogin')}</Link>
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </Field>
            {errors.root && (
              <p role="alert" className="text-destructive text-copy">
                {errors.root.message}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner label={t('reset.requestPending')} />
              ) : (
                t('reset.requestSubmit')
              )}
            </Button>
            <p className="text-center text-copy">
              <Link className="text-primary hover:underline" to="/login">
                {t('reset.backToLogin')}
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
