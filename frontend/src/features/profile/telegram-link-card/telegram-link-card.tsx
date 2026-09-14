import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLinkTelegram, useUnlinkTelegram } from '@/entities/user/profile.queries'
import { ChannelCard } from '@/features/profile/channel-card/channel-card'
import { sessionQueryKey } from '@/shared/api/session'
import type { MeResponse } from '@/shared/api/types.gen'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { TelegramMark } from '@/shared/ui/navigation/service-link/service-icon'
import { Button, buttonVariants } from '@/shared/ui/primitives/button'

const LINK_POLL_MS = 3000

export function TelegramLinkCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
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

  async function onUnlink() {
    try {
      await unlinkTelegram.mutateAsync()
      setDeepLink(null)
    } catch {
      toast.error(t('account.telegramUnlinkFailed'))
    }
  }

  const linked = user.telegram_linked
  const pending = deepLink !== null && !linked

  useEffect(() => {
    if (!pending) return undefined
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    }, LINK_POLL_MS)
    return () => clearInterval(timer)
  }, [pending, queryClient])

  return (
    <ChannelCard
      title={t('account.telegramTitle')}
      mark={<TelegramMark className="size-4 text-muted-foreground" />}
      value={linked && user.telegram_username ? `@${user.telegram_username}` : undefined}
      note={
        linked ? null : pending ? t('account.telegramDeepLinkHint') : t('account.channelUnlinked')
      }
      action={
        <>
          {linked ? (
            <Button variant="outline" onClick={onUnlink} disabled={unlinkTelegram.isPending}>
              {t('account.telegramUnlink')}
            </Button>
          ) : null}
          {pending ? (
            <ExternalLink className={buttonVariants()} href={deepLink}>
              {t('account.telegramOpen')}
            </ExternalLink>
          ) : (
            <Button onClick={onLink} disabled={linkTelegram.isPending}>
              {linked ? t('account.telegramChange') : t('account.telegramLink')}
            </Button>
          )}
        </>
      }
    />
  )
}
