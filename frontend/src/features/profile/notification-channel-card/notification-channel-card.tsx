import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CHANNEL_LABEL } from '@/entities/notification/notification.labels'
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
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

export function NotificationChannelCard({ user }: { user: MeResponse }) {
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
      toast.success('Предпочитаемый канал обновлён')
    } catch {
      toast.error('Не удалось изменить канал')
    }
  }

  async function onLinkTelegram() {
    try {
      const result = await linkTelegram.mutateAsync()
      setDeepLink(result.deep_link)
    } catch {
      toast.error('Не удалось начать привязку')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Канал уведомлений</CardTitle>
        <CardDescription>
          Если выбранный канал недоступен, система использует запасной порядок Telegram → Email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Предпочитаемый канал" htmlFor="preferred_channel">
          <Select value={user.preferred_channel ?? ''} onValueChange={onChangeChannel}>
            <SelectTrigger id="preferred_channel">
              <SelectValue placeholder="Автоматический выбор" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_LABEL) as Channel[]).map((channel) => (
                <SelectItem key={channel} value={channel} disabled={!channelAvailability[channel]}>
                  {CHANNEL_LABEL[channel]}
                  {!channelAvailability[channel] && ' — недоступен'}
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
                ? `Привязан${user.telegram_username ? `: @${user.telegram_username}` : ''}`
                : 'Не привязан'}
            </p>
          </div>
          {user.telegram_linked ? (
            <Button
              variant="outline"
              onClick={() => unlinkTelegram.mutate()}
              disabled={unlinkTelegram.isPending}
            >
              Отвязать
            </Button>
          ) : (
            <Button onClick={onLinkTelegram} disabled={linkTelegram.isPending}>
              Привязать
            </Button>
          )}
        </div>

        {deepLink && (
          <p className="text-sm">
            Откройте ссылку и отправьте боту команду запуска:{' '}
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={deepLink}
              target="_blank"
              rel="noreferrer"
            >
              перейти в Telegram
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Email:</span>
          <span>{user.email}</span>
          {user.email_verified ? (
            <Badge tone="primary">подтверждён</Badge>
          ) : (
            <Badge tone="danger">не подтверждён</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
