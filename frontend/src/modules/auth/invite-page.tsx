import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { formatDateTime } from '@/shared/lib/datetime'
import { applyServerErrors } from '@/shared/lib/form'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'
import { Spinner } from '@/shared/ui/spinner'
import { useAcceptInvite, useInvitePreview } from './api'

const schema = z
  .object({
    display_name: z.string().min(2, 'Имя должно содержать не менее 2 символов'),
    password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
    password_repeat: z.string(),
  })
  .refine((values) => values.password === values.password_repeat, {
    path: ['password_repeat'],
    message: 'Пароли не совпадают',
  })

type FormValues = z.infer<typeof schema>

export function InvitePage() {
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
          <Spinner label="Проверяем приглашение" />
        </CardContent>
      </Card>
    )
  }

  // Истёкшее, отозванное и уже принятое приглашение выглядят одинаково: valid=false.
  if (preview.isError || !preview.data?.valid) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Приглашение недействительно</CardTitle>
          <CardDescription>
            Ссылка истекла, была отозвана или уже использована. Запросите новое приглашение у
            администратора.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/login">Ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Приглашение</CardTitle>
        <CardDescription>
          {preview.data.email} · действует до {formatDateTime(preview.data.expires_at)}
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
            {isSubmitting ? <Spinner label="Завершаем регистрацию" /> : 'Принять приглашение'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
