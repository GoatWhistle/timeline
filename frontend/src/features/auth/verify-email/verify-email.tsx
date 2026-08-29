import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useResendVerification } from '@/entities/session/session.queries'
import { api, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState('')
  const resend = useResendVerification()

  async function onResend() {
    try {
      await resend.mutateAsync({ email })
      toast.success(t('verify.sent'), { description: t('verify.sentHint') })
    } catch {
      toast.error(t('verify.sendFailed'))
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
          <CardTitle>{t('verify.noTokenTitle')}</CardTitle>
          <CardDescription>{t('verify.noTokenHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 border-t pt-4">
            <Field label={t('verify.resendLabel')} htmlFor="resend-email">
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder={t('verify.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button variant="outline" disabled={!email || resend.isPending} onClick={onResend}>
              {t('verify.resendSubmit')}
            </Button>
          </div>
          <Button asChild variant="outline">
            <Link to="/login">{t('invite.toLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('verify.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && <Spinner label={t('verify.checking')} />}

        {isError && (
          <div className="flex items-start gap-2" role="alert">
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-copy">{isApiError(error) ? error.message : t('verify.failed')}</p>
          </div>
        )}

        {!isPending && !isError && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-done" aria-hidden="true" />
            <p className="text-copy">{t('verify.confirmed')}</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <Field label={t('verify.resendLabel')} htmlFor="resend-email">
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder={t('verify.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Button variant="outline" disabled={!email || resend.isPending} onClick={onResend}>
              {t('verify.resendSubmit')}
            </Button>
          </div>
        )}

        <Button asChild variant="outline">
          <Link to="/login">{t('invite.toLogin')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
