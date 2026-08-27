import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { useRegister } from '@/entities/session/session.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const schema = z
  .object({
    display_name: z.string().min(2, 'Имя должно содержать не менее 2 символов').max(120),
    email: z.email('Укажите корректный адрес'),
    password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'Пароли не совпадают',
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const register_ = useRegister()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', email: '', password: '', password_repeat: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await register_.mutateAsync({
        display_name: values.display_name,
        email: values.email,
        password: values.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['display_name', 'email', 'password'])
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>
          После регистрации на указанный адрес придёт письмо для подтверждения.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Имя" htmlFor="display_name" error={errors.display_name?.message}>
            <Input
              id="display_name"
              autoComplete="name"
              aria-invalid={Boolean(errors.display_name)}
              {...register('display_name')}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field label="Пароль" htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <Field
            label="Повторите пароль"
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
            <p role="alert" className="text-destructive text-sm">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner label="Создаём учётную запись" /> : 'Зарегистрироваться'}
          </Button>

          <p className="text-center text-sm">
            Уже есть аккаунт?{' '}
            <Link className="text-primary hover:underline" to="/login">
              Войти
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
