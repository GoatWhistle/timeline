import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { api, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Spinner } from '@/shared/ui/spinner'
import { useResendVerification } from './api'

/**
 * Подтверждение email по одноразовому токену из письма. Повторное применение
 * токена отклоняется сервером, поэтому запрос не повторяется автоматически.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState('')
  const resend = useResendVerification()

  async function onResend() {
    try {
      await resend.mutateAsync({ email })
      toast.success('Письмо отправлено', { description: 'Ссылка действует 24 часа' })
    } catch {
      toast.error('Не удалось отправить письмо')
    }
  }

  const { isPending, isError, error } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => unwrap(api.POST('/auth/verify-email', { body: { token } })),
    enabled: token.length > 0,
    retry: false,
    gcTime: 0,
  })

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ссылка недействительна</CardTitle>
          <CardDescription>В адресе нет токена подтверждения.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 border-t pt-4">
            <Field label="Отправить письмо повторно" htmlFor="resend-email">
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder="ваш@email.ru"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button variant="outline" disabled={!email || resend.isPending} onClick={onResend}>
              Отправить письмо
            </Button>
          </div>
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
        <CardTitle>Подтверждение email</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <Spinner label="Проверяем ссылку" />}

        {isError && (
          <div className="flex items-start gap-2" role="alert">
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm">
              {isApiError(error) ? error.message : 'Не удалось подтвердить адрес'}
            </p>
          </div>
        )}

        {!isPending && !isError && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-done" aria-hidden="true" />
            <p className="text-sm">Адрес подтверждён. Продуктовые уведомления теперь разрешены.</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <Field label="Отправить письмо повторно" htmlFor="resend-email">
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder="ваш@email.ru"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button variant="outline" disabled={!email || resend.isPending} onClick={onResend}>
              Отправить письмо
            </Button>
          </div>
        )}

        <Button asChild variant="outline">
          <Link to="/login">Ко входу</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
