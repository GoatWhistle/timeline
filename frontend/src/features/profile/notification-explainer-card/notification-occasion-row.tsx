import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY, NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import { useSetNotificationPreference } from '@/entities/notification/notification-preferences.queries'
import type { Channel, NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'
import { Switch } from '@/shared/ui/forms/switch'

const ALL_CHANNELS: Channel[] = ['TELEGRAM', 'EMAIL']

function isEnabled(
  preferences: NotificationPreference[],
  occasion: NotificationOccasion,
  channel: Channel,
): boolean {
  const found = preferences.find((p) => p.occasion === occasion && p.channel === channel)
  return found?.enabled ?? true
}

export function NotificationOccasionRow({
  occasion,
  preferences,
  liveChannels,
  onChannelsChange,
  children,
}: {
  occasion: NotificationOccasion
  preferences: NotificationPreference[]
  liveChannels: Set<Channel>
  onChannelsChange?: (anyEnabled: boolean) => void
  children?: React.ReactNode
}) {
  const { t } = useTranslation('notification')
  const setPreference = useSetNotificationPreference()

  function toggle(channel: Channel, enabled: boolean) {
    setPreference.mutate(
      { occasion, channel, enabled },
      {
        onSuccess: () => {
          toast.success(t('explainer.toggleUpdated'))
          onChannelsChange?.(
            ALL_CHANNELS.filter((other) => liveChannels.has(other)).some((other) =>
              other === channel ? enabled : isEnabled(preferences, occasion, other),
            ),
          )
        },
        onError: () => toast.error(t('explainer.toggleFailed')),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="min-w-0 font-medium text-copy" data-explainer-type={occasion}>
          {t(`explainer.type.${occasion}.name`)}
        </p>
        {children}
      </div>
      <div className="flex shrink-0 justify-center gap-4">
        {ALL_CHANNELS.map((channel) => {
          const live = liveChannels.has(channel)
          return (
            <div
              key={channel}
              data-occasion-channel={channel}
              data-channel-live={live ? 'true' : 'false'}
              className="flex items-center gap-2 text-meta"
            >
              <Switch
                id={`notification-preference-${occasion}-${channel}`}
                checked={isEnabled(preferences, occasion, channel)}
                aria-label={t('explainer.toggleLabel', {
                  occasion: t(NOTIFICATION_TYPE_KEY[occasion]),
                  channel: t(CHANNEL_KEY[channel]),
                })}
                disabled={!live || setPreference.isPending}
                onCheckedChange={(checked) => toggle(channel, checked === true)}
              />
              <label
                htmlFor={`notification-preference-${occasion}-${channel}`}
                className="text-muted-foreground"
              >
                {t(CHANNEL_KEY[channel])}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
