import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { useRegister } from '@/entities/session/session.queries'
import { AuthExits } from '@/features/auth/door/auth-exits'
import { nicknameProblem } from '@/shared/forms/nickname'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
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
    nickname: z
      .string()
      .trim()
      .min(1, 'auth:validation.nicknameRequired')
      .superRefine((value, ctx) => {
        const problem = nicknameProblem(value)
        if (problem !== null) ctx.addIssue({ code: 'custom', message: problem })
      }),
    email: z.email('auth:validation.email'),
    password: z.string().min(8, 'auth:validation.passwordMin'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'auth:validation.passwordMismatch',
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const register_ = useRegister()

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
      nickname: '',
      email: '',
      password: '',
      password_repeat: '',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await register_.mutateAsync({
        first_name: values.first_name,
        middle_name: values.middle_name?.trim() ? values.middle_name : undefined,
        last_name: values.last_name,
        nickname: values.nickname,
        email: values.email,
        password: values.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, [
        'first_name',
        'last_name',
        'middle_name',
        'nickname',
        'email',
        'password',
      ])
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CrossfadeSwap swapKey={i18n.language}>
          <CardTitle>{t('register.title')}</CardTitle>
          <CardDescription>{t('register.description')}</CardDescription>
        </CrossfadeSwap>
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
            label={t('field.nickname')}
            htmlFor="nickname"
            required
            error={errors.nickname?.message}
          >
            <Input
              id="nickname"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="off"
              aria-invalid={Boolean(errors.nickname)}
              {...register('nickname')}
            />
          </Field>

          <Field label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
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
            {isSubmitting ? (
              <Spinner label={t('register.pending')} />
            ) : (
              <CrossfadeSwap swapKey={i18n.language}>{t('register.submit')}</CrossfadeSwap>
            )}
          </Button>

          <AuthExits exits={[{ to: '/login', label: t('register.signIn') }]} />
        </form>
      </CardContent>
    </Card>
  )
}
