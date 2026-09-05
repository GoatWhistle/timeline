import { Mail } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY } from '@/entities/notification/notification.labels'
import { useUpdateProfile } from '@/entities/user/profile.queries'
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
import { TelegramMark } from '@/shared/ui/navigation/service-link/service-icon'

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

  async function onChangeChannel(value: string) {
    try {
      await updateProfile.mutateAsync({ preferred_channel: value as Channel })
      toast.success(t('card.channelUpdated'))
    } catch {
      toast.error(t('card.channelFailed'))
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
              {(Object.keys(CHANNEL_KEY) as Channel[]).map((channel) => {
                const Icon = CHANNEL_ICON[channel]
                return (
                  <SelectItem
                    key={channel}
                    value={channel}
                    disabled={!channelAvailability[channel]}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      {t(CHANNEL_KEY[channel])}
                      {!channelAvailability[channel] && t('card.unavailable')}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </Field>

        <p className="text-meta text-muted-foreground">{t('card.setUpInAccount')}</p>
      </CardContent>
    </Card>
  )
}
