import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { api, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export function EmailChangeConfirmPage() {
  const { t } = useTranslation('auth')
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
          <CardTitle>{t('emailChange.noTokenTitle')}</CardTitle>
          <CardDescription>{t('emailChange.noTokenHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/?settings=account">{t('emailChange.toProfile')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('emailChange.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <Spinner label={t('emailChange.checking')} />}

        {isError && (
          <div className="flex items-start gap-2" role="alert">
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-copy">
              {isApiError(error) ? error.message : t('emailChange.failed')}
            </p>
          </div>
        )}

        {!isPending && !isError && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-done" aria-hidden="true" />
            <p className="text-copy">{t('emailChange.changed')}</p>
          </div>
        )}

        <Button asChild variant="outline">
          <Link to="/?settings=account">{t('emailChange.toProfile')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
