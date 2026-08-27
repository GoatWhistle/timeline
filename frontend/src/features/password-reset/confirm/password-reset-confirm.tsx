import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useResetPassword } from '@/entities/session/session.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

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

export function PasswordResetConfirm() {
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
