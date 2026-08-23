import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { resetCsrfToken } from '@/shared/api/client'
import { useSession } from '@/shared/api/session'
import type { Channel } from '@/shared/api/types.gen'
import { CHANNEL_LABEL } from '@/shared/lib/enums'
import { applyServerErrors } from '@/shared/lib/form'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'
import { PasswordInput } from '@/shared/ui/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingState } from '@/shared/ui/states'
import {
  useChangeEmail,
  useDeactivateAccount,
  useLinkTelegram,
  useLogoutAllSessions,
  useUnlinkTelegram,
  useUpdateProfile,
} from './api'

const profileSchema = z.object({
  display_name: z.string().min(2, 'Имя должно содержать не менее 2 символов').max(120),
})
type ProfileValues = z.infer<typeof profileSchema>

const emailSchema = z.object({
  new_email: z.email('Укажите корректный адрес'),
  password: z.string().min(1, 'Введите текущий пароль'),
})
type EmailValues = z.infer<typeof emailSchema>

export function ProfilePage() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()

  const updateProfile = useUpdateProfile()
  const changeEmail = useChangeEmail()
  const linkTelegram = useLinkTelegram()
  const unlinkTelegram = useUnlinkTelegram()
  const deactivate = useDeactivateAccount()
  const logoutAll = useLogoutAllSessions()
  const queryClient = useQueryClient()

  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deepLink, setDeepLink] = useState<string | null>(null)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { display_name: user?.display_name ?? '' },
  })

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: '', password: '' },
  })

  if (isLoading || !user) return <LoadingState />

  // Канал доступен только при рабочей привязке: Email — после подтверждения адреса.
  const channelAvailability: Record<Channel, boolean> = {
    TELEGRAM: user.telegram_linked,
    EMAIL: user.email_verified,
  }

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile.mutateAsync({ display_name: values.display_name })
      toast.success('Профиль сохранён')
    } catch (error) {
      applyServerErrors(error, profileForm.setError, ['display_name'])
    }
  }

  async function onChangeChannel(value: string) {
    try {
      await updateProfile.mutateAsync({ preferred_channel: value as Channel })
      toast.success('Предпочитаемый канал обновлён')
    } catch {
      toast.error('Не удалось изменить канал')
    }
  }

  async function onChangeEmail(values: EmailValues) {
    try {
      await changeEmail.mutateAsync(values)
      emailForm.reset()
      toast.success('Письмо отправлено', {
        description: 'Адрес изменится только после подтверждения по ссылке из письма',
      })
    } catch (error) {
      applyServerErrors(error, emailForm.setError, ['new_email', 'password'])
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

  async function onDeactivate() {
    try {
      await deactivate.mutateAsync()
      // Деактивация отзывает сессии на сервере: локальный кэш и CSRF-токен
      // больше не действительны.
      resetCsrfToken()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Не удалось деактивировать учётную запись')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Профиль" description="Личные данные и настройки уведомлений" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Личные данные</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={profileForm.handleSubmit(onSaveProfile)}
              noValidate
            >
              <Field
                label="Имя"
                htmlFor="display_name"
                error={profileForm.formState.errors.display_name?.message}
              >
                <Input
                  id="display_name"
                  aria-invalid={Boolean(profileForm.formState.errors.display_name)}
                  {...profileForm.register('display_name')}
                />
              </Field>
              <div>
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  Сохранить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
                    <SelectItem
                      key={channel}
                      value={channel}
                      disabled={!channelAvailability[channel]}
                    >
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

        <Card>
          <CardHeader>
            <CardTitle>Смена email</CardTitle>
            <CardDescription>
              До подтверждения нового адреса вход продолжает работать со старым.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.pending_email && (
              <p className="mb-4 rounded-md border border-dashed p-3 text-sm">
                Ожидает подтверждения: <strong>{user.pending_email}</strong>
              </p>
            )}
            <form
              className="flex flex-col gap-4"
              onSubmit={emailForm.handleSubmit(onChangeEmail)}
              noValidate
            >
              <Field
                label="Новый email"
                htmlFor="new_email"
                error={emailForm.formState.errors.new_email?.message}
              >
                <Input
                  id="new_email"
                  type="email"
                  aria-invalid={Boolean(emailForm.formState.errors.new_email)}
                  {...emailForm.register('new_email')}
                />
              </Field>
              <Field
                label="Текущий пароль"
                htmlFor="current_password"
                error={emailForm.formState.errors.password?.message}
              >
                <PasswordInput
                  id="current_password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(emailForm.formState.errors.password)}
                  {...emailForm.register('password')}
                />
              </Field>
              {emailForm.formState.errors.root && (
                <p role="alert" className="text-destructive text-sm">
                  {emailForm.formState.errors.root.message}
                </p>
              )}
              <div>
                <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                  Отправить подтверждение
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сессии</CardTitle>
            <CardDescription>
              Завершение всех сессий выкинет вас из системы на всех устройствах.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={logoutAll.isPending}
              onClick={async () => {
                await logoutAll
                  .mutateAsync()
                  .catch(() => toast.error('Не удалось завершить сессии'))
                resetCsrfToken()
                queryClient.clear()
                navigate('/login', { replace: true })
              }}
            >
              Завершить все сессии
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Деактивация учётной записи</CardTitle>
            <CardDescription>
              Деактивация обратима: вход блокируется, привязка Telegram удаляется, запланированные
              уведомления отменяются. Вернуть доступ может администратор.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
              Деактивировать
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Деактивировать учётную запись?"
        description="Вы выйдете из системы, а вход будет заблокирован до восстановления администратором."
        confirmLabel="Деактивировать"
        destructive
        disabled={deactivate.isPending}
        onConfirm={onDeactivate}
      />
    </div>
  )
}
