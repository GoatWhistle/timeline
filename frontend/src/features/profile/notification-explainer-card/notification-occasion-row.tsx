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
}: {
  occasion: NotificationOccasion
  preferences: NotificationPreference[]
}) {
  const { t } = useTranslation('notification')
  const setPreference = useSetNotificationPreference()

  function toggle(channel: Channel, enabled: boolean) {
    setPreference.mutate(
      { occasion, channel, enabled },
      {
        onSuccess: () => toast.success(t('explainer.toggleUpdated')),
        onError: () => toast.error(t('explainer.toggleFailed')),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-copy" data-explainer-type={occasion}>
          {t(`explainer.type.${occasion}.name`)}
        </p>
        <p className="max-w-prose text-meta text-muted-foreground">
          {t(`explainer.type.${occasion}.when`)}
        </p>
      </div>
      <div className="flex shrink-0 gap-4">
        {ALL_CHANNELS.map((channel) => (
          <div key={channel} className="flex items-center gap-2 text-meta">
            <Switch
              id={`notification-preference-${occasion}-${channel}`}
              checked={isEnabled(preferences, occasion, channel)}
              aria-label={t('explainer.toggleLabel', {
                occasion: t(NOTIFICATION_TYPE_KEY[occasion]),
                channel: t(CHANNEL_KEY[channel]),
              })}
              disabled={setPreference.isPending}
              onCheckedChange={(checked) => toggle(channel, checked === true)}
            />
            <label
              htmlFor={`notification-preference-${occasion}-${channel}`}
              className="text-muted-foreground"
            >
              {t(CHANNEL_KEY[channel])}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
