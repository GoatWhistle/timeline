import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY } from '@/entities/notification/notification.labels'
import {
  useLinkTelegram,
  useUnlinkTelegram,
  useUpdateProfile,
} from '@/entities/user/profile.queries'
import type { Channel, MeResponse } from '@/shared/api/types.gen'
import { Field } from '@/shared/ui/forms/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

export function NotificationChannelCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation('notification')
  const updateProfile = useUpdateProfile()
  const linkTelegram = useLinkTelegram()
  const unlinkTelegram = useUnlinkTelegram()
  const [deepLink, setDeepLink] = useState<string | null>(null)

  const channelAvailability: Record<Channel, boolean> = {
    TELEGRAM: user.telegram_linked,
    EMAIL: user.email_verified,
  }

  async function onChangeChannel(value: string) {
    try {
      await updateProfile.mutateAsync({ preferred_channel: value as Channel })
      toast.success(t('card.channelUpdated'))
    } catch {
      toast.error(t('card.channelFailed'))
    }
  }

  async function onLinkTelegram() {
    try {
      const result = await linkTelegram.mutateAsync()
      setDeepLink(result.deep_link)
    } catch {
      toast.error(t('card.linkFailed'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('card.title')}</CardTitle>
        <CardDescription>{t('card.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label={t('card.preferred')} htmlFor="preferred_channel">
          <Select value={user.preferred_channel ?? ''} onValueChange={onChangeChannel}>
            <SelectTrigger id="preferred_channel">
              <SelectValue placeholder={t('card.autoPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_KEY) as Channel[]).map((channel) => (
                <SelectItem key={channel} value={channel} disabled={!channelAvailability[channel]}>
                  {t(CHANNEL_KEY[channel])}
                  {!channelAvailability[channel] && t('card.unavailable')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="font-medium text-sm">Telegram</p>
            <p className="text-muted-foreground text-sm">
              {user.telegram_linked
                ? user.telegram_username
                  ? t('card.linkedAs', { username: user.telegram_username })
                  : t('card.linked')
                : t('card.notLinked')}
            </p>
          </div>
          {user.telegram_linked ? (
            <Button
              variant="outline"
              onClick={() => unlinkTelegram.mutate()}
              disabled={unlinkTelegram.isPending}
            >
              {t('card.unlink')}
            </Button>
          ) : (
            <Button onClick={onLinkTelegram} disabled={linkTelegram.isPending}>
              {t('card.link')}
            </Button>
          )}
        </div>

        {deepLink && (
          <p className="text-sm">
            {t('card.deepLinkHint')}{' '}
            <ExternalLink className="text-primary hover:underline" href={deepLink}>
              {t('card.openTelegram')}
            </ExternalLink>
          </p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Email:</span>
          <span>{user.email}</span>
          {user.email_verified ? (
            <Badge tone="primary">{t('card.verified')}</Badge>
          ) : (
            <Badge tone="danger">{t('card.unverified')}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
