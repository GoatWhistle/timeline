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
    first_name: z
      .string()
      .trim()
      .min(1, 'auth:validation.firstNameMin')
      .max(80, 'auth:validation.nameMax'),
    middle_name: z.string().trim().max(80, 'auth:validation.nameMax').optional(),
    last_name: z
      .string()
      .trim()
      .min(1, 'auth:validation.lastNameMin')
      .max(80, 'auth:validation.nameMax'),
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
    defaultValues: {
      first_name: '',
      middle_name: '',
      last_name: '',
      password: '',
      password_repeat: '',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await accept.mutateAsync({
        token,
        first_name: values.first_name,
        middle_name: values.middle_name?.trim() ? values.middle_name : undefined,
        last_name: values.last_name,
        password: values.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['first_name', 'middle_name', 'last_name', 'password'])
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
            label={t('field.firstName')}
            htmlFor="first_name"
            required
            error={errors.first_name?.message}
          >
            <Input
              id="first_name"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.first_name)}
              {...register('first_name')}
            />
          </Field>
          <Field
            label={t('field.lastName')}
            htmlFor="last_name"
            required
            error={errors.last_name?.message}
          >
            <Input
              id="last_name"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.last_name)}
              {...register('last_name')}
            />
          </Field>
          <Field
            label={t('field.middleName')}
            htmlFor="middle_name"
            error={errors.middle_name?.message}
          >
            <Input
              id="middle_name"
              autoComplete="additional-name"
              aria-invalid={Boolean(errors.middle_name)}
              {...register('middle_name')}
            />
          </Field>
          <Field
            label={t('field.password')}
            htmlFor="password"
            required
            error={errors.password?.message}
          >
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
            required
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
