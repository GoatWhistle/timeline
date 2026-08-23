import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { api, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'

/**
 * Подтверждение смены адреса по ссылке из письма. До подтверждения основным
 * остаётся прежний email (раздел 3 ТЗ).
 */
export function EmailChangeConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const { isPending, isError, error } = useQuery({
    queryKey: ['email-change-confirm', token],
    queryFn: () => unwrap(api.POST('/auth/email-change/confirm', { body: { token } })),
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
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/profile">В профиль</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Смена email</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <Spinner label="Подтверждаем адрес" />}

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
            <p className="text-sm">Адрес изменён. Дальше входите с новым email.</p>
          </div>
        )}

        <Button asChild variant="outline">
          <Link to="/profile">В профиль</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
