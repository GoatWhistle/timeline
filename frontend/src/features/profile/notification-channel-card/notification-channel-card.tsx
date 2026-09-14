import { Mail } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY } from '@/entities/notification/notification.labels'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import type { Channel, MeResponse } from '@/shared/api/types.gen'
import { Switch } from '@/shared/ui/forms/switch'
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

  const available: Record<Channel, boolean> = {
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
      <CardHeader className="pb-4">
        <CardTitle>{t('card.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 pb-5 sm:grid-cols-2">
        {ALL_CHANNELS.map((channel) => {
          const Icon = CHANNEL_ICON[channel]
          const usable = available[channel]
          const on = usable && selected.has(channel)
          return (
            <div
              key={channel}
              data-notification-channel={channel}
              data-channel-on={on ? 'true' : 'false'}
              className="flex min-w-0 items-center gap-3 rounded-control border border-border px-3 py-2.5"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-copy text-foreground">
                {t(CHANNEL_KEY[channel])}
              </span>
              <Switch
                id={`notification-channel-${channel}`}
                checked={on}
                disabled={!usable || updateProfile.isPending}
                aria-label={t('card.toggleLabel', { channel: t(CHANNEL_KEY[channel]) })}
                onCheckedChange={(checked) => toggle(channel, checked === true)}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
