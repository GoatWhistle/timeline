import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { applyServerErrors } from '@/shared/lib/form'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'
import { Spinner } from '@/shared/ui/spinner'
import { useForgotPassword, useResetPassword } from './api'

const forgotSchema = z.object({ email: z.email('Укажите корректный адрес') })
type ForgotValues = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
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
        <CardTitle>Восстановление пароля</CardTitle>
        <CardDescription>Пришлём ссылку для установки нового пароля.</CardDescription>
      </CardHeader>
      <CardContent>
        {isSubmitSuccessful && !errors.root ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Если адрес зарегистрирован, письмо со ссылкой уже отправлено. Ссылка действует 30
              минут.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Вернуться ко входу</Link>
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
              <p role="alert" className="text-destructive text-sm">
                {errors.root.message}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner label="Отправляем письмо" /> : 'Отправить ссылку'}
            </Button>
            <p className="text-center text-sm">
              <Link className="text-primary hover:underline" to="/login">
                Вернуться ко входу
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

const resetSchema = z
  .object({
    password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'Пароли не совпадают',
  })

type ResetValues = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
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
      // После сброса все сессии отзываются, поэтому вход выполняется заново.
      toast.success('Пароль изменён', { description: 'Войдите с новым паролем' })
      navigate('/login', { replace: true })
    } catch (error) {
      applyServerErrors(error, setError, ['password'])
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ссылка недействительна</CardTitle>
          <CardDescription>В адресе нет токена восстановления.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/forgot-password">Запросить новую ссылку</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Новый пароль</CardTitle>
        <CardDescription>После смены пароля все активные сессии будут завершены.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Новый пароль" htmlFor="password" error={errors.password?.message}>
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
            {isSubmitting ? <Spinner label="Сохраняем пароль" /> : 'Сохранить пароль'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
