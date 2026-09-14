import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { DeviceList } from '@/features/device-list/device-list'
import { SessionPolicyCard } from '@/features/device-list/session-policy-card'
import {
  DeactivateAccountCard,
  LogoutAllCard,
} from '@/features/profile/account-actions-card/account-actions-card'
import { EmailChangeCard } from '@/features/profile/email-change-card/email-change-card'
import { NicknameCard } from '@/features/profile/nickname-card/nickname-card'
import { NotificationChannelCard } from '@/features/profile/notification-channel-card/notification-channel-card'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import { PasswordChangeCard } from '@/features/profile/password-change-card/password-change-card'
import { PersonalDataCard } from '@/features/profile/personal-data-card/personal-data-card'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
import { ReminderScheduleCard } from '@/features/profile/reminder-schedule-card/reminder-schedule-card'
import { TelegramLinkCard } from '@/features/profile/telegram-link-card/telegram-link-card'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import type { MeResponse, NotificationPreference } from '@/shared/api/types.gen'
import { SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { TimezoneSelect } from '@/shared/ui/primitives/timezone-select/timezone-select'
import type { SettingsSectionId } from './sections'

function AppearancePanel({ user }: { user: MeResponse }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()

  async function onChangeTimezone(value: string) {
    try {
      await updateProfile.mutateAsync({ timezone: value })
      toast.success(t('timezone.updated'))
    } catch {
      toast.error(t('timezone.failed'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.theme')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeChoice />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{t('language.label')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageChoice />
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{t('settings.timezone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimezoneSelect
              value={user.timezone ?? SYSTEM_TIME_ZONE}
              onChange={onChangeTimezone}
              disabled={updateProfile.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AccountPanel({ user }: { user: MeResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <EmailChangeCard
        email={user.email}
        emailVerified={user.email_verified}
        pendingEmail={user.pending_email}
      />
      <TelegramLinkCard user={user} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <PasswordChangeCard />
        <DeactivateAccountCard />
      </div>
    </div>
  )
}

function NotificationsPanel({
  user,
  notificationPreferences,
}: {
  user: MeResponse
  notificationPreferences: NotificationPreference[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <NotificationChannelCard user={user} />
      <NotificationExplainerCard preferences={notificationPreferences} />
      <ReminderScheduleCard />
    </div>
  )
}

export function SettingsPanel({
  section,
  user,
  notificationPreferences,
}: {
  section: SettingsSectionId
  user: MeResponse
  notificationPreferences: NotificationPreference[]
}) {
  if (section === 'appearance') return <AppearancePanel user={user} />

  if (section === 'account') return <AccountPanel user={user} />

  if (section === 'shortcuts') return <ShortcutSettings />

  if (section === 'notifications') {
    return <NotificationsPanel user={user} notificationPreferences={notificationPreferences} />
  }

  if (section === 'sessions') {
    return (
      <div className="flex flex-col gap-4">
        <DeviceList />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <SessionPolicyCard />
          <LogoutAllCard />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PersonalDataCard
        userId={user.id}
        firstName={user.first_name ?? ''}
        middleName={user.middle_name}
        lastName={user.last_name ?? ''}
        legacyDisplayName={user.legacy_display_name}
        avatarUrl={user.avatar_url}
        bio={user.bio}
      />
      <NicknameCard nickname={user.nickname} profilePublic={user.profile_public} />
      <ProfileLinksCard />
    </div>
  )
}
