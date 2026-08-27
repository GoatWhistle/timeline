import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useChangeEmail } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PasswordInput } from '@/shared/ui/forms/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const emailSchema = z.object({
  new_email: z.email('Укажите корректный адрес'),
  password: z.string().min(1, 'Введите текущий пароль'),
})
type EmailValues = z.infer<typeof emailSchema>

export function EmailChangeCard({ pendingEmail }: { pendingEmail?: string }) {
  const changeEmail = useChangeEmail()
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: '', password: '' },
  })

  async function onChangeEmail(values: EmailValues) {
    try {
      await changeEmail.mutateAsync(values)
      emailForm.reset()
      toast.success('Письмо отправлено', {
        description: 'Адрес изменится только после подтверждения по ссылке из письма',
      })
    } catch (error) {
      applyServerErrors(error, emailForm.setError, ['new_email', 'password'])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Смена email</CardTitle>
        <CardDescription>
          До подтверждения нового адреса вход продолжает работать со старым.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingEmail && (
          <p className="mb-4 rounded-md border border-dashed p-3 text-sm">
            Ожидает подтверждения: <strong>{pendingEmail}</strong>
          </p>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={emailForm.handleSubmit(onChangeEmail)}
          noValidate
        >
          <Field
            label="Новый email"
            htmlFor="new_email"
            error={emailForm.formState.errors.new_email?.message}
          >
            <Input
              id="new_email"
              type="email"
              aria-invalid={Boolean(emailForm.formState.errors.new_email)}
              {...emailForm.register('new_email')}
            />
          </Field>
          <Field
            label="Текущий пароль"
            htmlFor="current_password"
            error={emailForm.formState.errors.password?.message}
          >
            <PasswordInput
              id="current_password"
              autoComplete="current-password"
              aria-invalid={Boolean(emailForm.formState.errors.password)}
              {...emailForm.register('password')}
            />
          </Field>
          {emailForm.formState.errors.root && (
            <p role="alert" className="text-destructive text-sm">
              {emailForm.formState.errors.root.message}
            </p>
          )}
          <div>
            <Button type="submit" disabled={emailForm.formState.isSubmitting}>
              Отправить подтверждение
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
