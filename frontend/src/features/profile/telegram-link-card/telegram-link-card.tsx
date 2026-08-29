import { Link2, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLinkTelegram, useUnlinkTelegram } from '@/entities/user/profile.queries'
import type { MeResponse } from '@/shared/api/types.gen'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

export function TelegramLinkCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()
  const linkTelegram = useLinkTelegram()
  const unlinkTelegram = useUnlinkTelegram()
  const [deepLink, setDeepLink] = useState<string | null>(null)

  async function onLink() {
    try {
      const result = await linkTelegram.mutateAsync()
      setDeepLink(result.deep_link)
    } catch {
      toast.error(t('account.telegramLinkFailed'))
    }
  }

  const linked = user.telegram_linked

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.telegramTitle')}</CardTitle>
        <CardDescription>{t('account.telegramHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Badge tone={linked ? 'primary' : 'neutral'}>
              {linked ? (
                <Link2 className="size-3 shrink-0" aria-hidden="true" />
              ) : (
                <Link2Off className="size-3 shrink-0" aria-hidden="true" />
              )}
              {linked ? t('account.telegramLinked') : t('account.telegramNotLinked')}
            </Badge>
            {linked && user.telegram_username ? (
              <p className="mt-1 text-meta text-muted-foreground">@{user.telegram_username}</p>
            ) : null}
          </div>

          {linked ? (
            <Button
              variant="outline"
              onClick={() => unlinkTelegram.mutate()}
              disabled={unlinkTelegram.isPending}
            >
              {t('account.telegramUnlink')}
            </Button>
          ) : (
            <Button onClick={onLink} disabled={linkTelegram.isPending}>
              {t('account.telegramLink')}
            </Button>
          )}
        </div>

        {deepLink ? (
          <p className="text-copy">
            {t('account.telegramDeepLinkHint')}{' '}
            <ExternalLink className="text-primary hover:underline" href={deepLink}>
              {t('account.telegramOpen')}
            </ExternalLink>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
