import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { DeviceList } from '@/features/device-list/device-list'
import {
  DeactivateAccountCard,
  LogoutAllCard,
} from '@/features/profile/account-actions-card/account-actions-card'
import { AccountIdentityCard } from '@/features/profile/account-identity-card/account-identity-card'
import { EmailChangeCard } from '@/features/profile/email-change-card/email-change-card'
import { NicknameCard } from '@/features/profile/nickname-card/nickname-card'
import { NotificationChannelCard } from '@/features/profile/notification-channel-card/notification-channel-card'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import { PersonalDataCard } from '@/features/profile/personal-data-card/personal-data-card'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
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
      <Card>
        <CardHeader>
          <CardTitle>{t('language.label')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageChoice />
        </CardContent>
      </Card>
      <Card>
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
  )
}

function AccountPanel({ user }: { user: MeResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <AccountIdentityCard user={user} />
      <EmailChangeCard pendingEmail={user.pending_email} />
      <TelegramLinkCard user={user} />
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
        <LogoutAllCard />
      </div>
    )
  }

  if (section === 'danger') {
    return (
      <div className="flex flex-col gap-4">
        <DeactivateAccountCard />
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
