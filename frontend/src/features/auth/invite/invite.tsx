import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { useAcceptInvite, useInvitePreview } from '@/entities/session/session.queries'
import { formatDateTime } from '@/shared/datetime/datetime'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const schema = z
  .object({
    display_name: z.string().min(2, 'auth:validation.nameMin'),
    password: z.string().min(8, 'auth:validation.passwordMin'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'auth:validation.passwordMismatch',
  })

type FormValues = z.infer<typeof schema>

export function InvitePage() {
  const { t } = useTranslation('auth')
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const preview = useQuery(useInvitePreview(token))
  const accept = useAcceptInvite()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', password: '', password_repeat: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await accept.mutateAsync({
        token,
        display_name: values.display_name,
        password: values.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['display_name', 'password'])
    }
  }

  if (preview.isPending) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex justify-center p-10">
          <Spinner label={t('invite.checking')} />
        </CardContent>
      </Card>
    )
  }

  if (preview.isError || !preview.data?.valid) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('invite.invalidTitle')}</CardTitle>
          <CardDescription>{t('invite.invalidHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/login">{t('invite.toLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('invite.title')}</CardTitle>
        <CardDescription>
          {t('invite.validUntil', {
            email: preview.data.email,
            date: formatDateTime(preview.data.expires_at),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field
            label={t('field.name')}
            htmlFor="display_name"
            error={errors.display_name?.message}
          >
            <Input
              id="display_name"
              autoComplete="name"
              aria-invalid={Boolean(errors.display_name)}
              {...register('display_name')}
            />
          </Field>
          <Field label={t('field.password')} htmlFor="password" error={errors.password?.message}>
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
            {isSubmitting ? <Spinner label={t('invite.pending')} /> : t('invite.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
