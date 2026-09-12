import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLinkTelegram, useUnlinkTelegram } from '@/entities/user/profile.queries'
import { ChannelCard } from '@/features/profile/channel-card/channel-card'
import { channelState } from '@/features/profile/channel-card/channel-state'
import type { MeResponse } from '@/shared/api/types.gen'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { TelegramMark } from '@/shared/ui/navigation/service-link/service-icon'
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

  async function onUnlink() {
    try {
      await unlinkTelegram.mutateAsync()
      setDeepLink(null)
    } catch {
      toast.error(t('account.telegramUnlinkFailed'))
    }
  }

  const linked = user.telegram_linked
  const state = channelState({ linked, pending: Boolean(deepLink) && !linked })

  return (
    <ChannelCard
      title={t('account.telegramTitle')}
      hint={t('account.telegramHint')}
      mark={<TelegramMark className="size-4 text-telegram" />}
      state={state}
      value={linked && user.telegram_username ? `@${user.telegram_username}` : undefined}
      action={
        linked ? (
          <Button variant="outline" onClick={onUnlink} disabled={unlinkTelegram.isPending}>
            {t('account.telegramUnlink')}
          </Button>
        ) : (
          <Button onClick={onLink} disabled={linkTelegram.isPending}>
            {t('account.telegramLink')}
          </Button>
        )
      }
    >
      {deepLink && !linked ? (
        <p className="text-copy">
          {t('account.telegramDeepLinkHint')}{' '}
          <ExternalLink className="text-primary hover:underline" href={deepLink}>
            {t('account.telegramOpen')}
          </ExternalLink>
        </p>
      ) : null}
    </ChannelCard>
  )
}
