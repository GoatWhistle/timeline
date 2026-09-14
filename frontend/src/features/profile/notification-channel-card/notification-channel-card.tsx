import { Mail } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY } from '@/entities/notification/notification.labels'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import type { Channel, MeResponse } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { TelegramMark } from '@/shared/ui/navigation/service-link/service-icon'

const ALL_CHANNELS: Channel[] = ['TELEGRAM', 'EMAIL']

const CHANNEL_ICON: Record<Channel, React.ComponentType<{ className?: string }>> = {
  TELEGRAM: TelegramMark,
  EMAIL: Mail,
}

export function NotificationChannelCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation('notification')
  const updateProfile = useUpdateProfile()

  const channelAvailability: Record<Channel, boolean> = {
    TELEGRAM: user.telegram_linked,
    EMAIL: user.email_verified,
  }

  const selected = new Set(user.notification_channels)

  async function toggle(channel: Channel, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(channel)
    else next.delete(channel)
    try {
      await updateProfile.mutateAsync({ notification_channels: [...next] })
      toast.success(t('card.channelUpdated'))
    } catch {
      toast.error(t('card.channelFailed'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('card.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">{t('card.title')}</legend>
          {ALL_CHANNELS.map((channel) => {
            const Icon = CHANNEL_ICON[channel]
            const available = channelAvailability[channel]
            return (
              <label
                key={channel}
                htmlFor={`notification-channel-${channel}`}
                className="flex items-center gap-3 text-copy"
              >
                <Checkbox
                  id={`notification-channel-${channel}`}
                  checked={selected.has(channel)}
                  disabled={!available || updateProfile.isPending}
                  onCheckedChange={(checked) => toggle(channel, checked === true)}
                />
                <Icon className="size-4 shrink-0" />
                <span>
                  {t(CHANNEL_KEY[channel])}
                  {!available && (
                    <span className="text-muted-foreground">{t('card.unavailable')}</span>
                  )}
                </span>
              </label>
            )
          })}
        </fieldset>

        {selected.size === 0 && (
          <Note tone="warning" title={t('card.emptyTitle')}>
            {t('card.emptyHint')}
          </Note>
        )}
      </CardContent>
    </Card>
  )
}
