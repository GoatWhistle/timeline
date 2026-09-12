import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { AuthExits } from '@/features/auth/door/auth-exits'
import { api, unwrap } from '@/shared/api/client'
import { failureMessage } from '@/shared/api/failure'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'

export function EmailChangeCancelPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const { isPending, isError, error } = useQuery({
    queryKey: ['email-change-cancel', token],
    queryFn: () => unwrap(api.POST('/auth/email-change/cancel', { body: { token } })),
    enabled: token.length > 0,
    retry: false,
    gcTime: 0,
  })

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('emailChangeCancel.noTokenTitle')}</CardTitle>
          <CardDescription>{t('emailChangeCancel.noTokenHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthExits exits={[{ to: '/login', label: t('emailChangeCancel.toLogin') }]} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('emailChangeCancel.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <Spinner label={t('emailChangeCancel.checking')} />}

        {isError && (
          <div className="flex items-start gap-2" role="alert">
            <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-copy">{failureMessage(error)}</p>
          </div>
        )}

        {!isPending && !isError && (
          <div className="flex items-start gap-2">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-status-done" aria-hidden="true" />
            <p className="text-copy">{t('emailChangeCancel.cancelled')}</p>
          </div>
        )}

        <AuthExits exits={[{ to: '/login', label: t('emailChangeCancel.toLogin') }]} />
      </CardContent>
    </Card>
  )
}
