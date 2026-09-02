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
import { PersonalDataCard } from '@/features/profile/personal-data-card/personal-data-card'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
import { TelegramLinkCard } from '@/features/profile/telegram-link-card/telegram-link-card'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import type { MeResponse } from '@/shared/api/types.gen'
import { SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'
import { TimezoneSelect } from '@/shared/ui/primitives/timezone-select/timezone-select'
import type { SettingsSectionId } from './sections'

function Stack({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="py-4">
      <p className="font-medium text-copy">{title}</p>
      {hint ? <p className="mt-0.5 max-w-prose text-meta text-muted-foreground">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  )
}

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
    <div className="divide-y divide-border">
      <Stack title={t('settings.theme')}>
        <ThemeChoice />
      </Stack>
      <Stack title={t('language.label')}>
        <LanguageChoice />
      </Stack>
      <Stack title={t('settings.timezone')}>
        <TimezoneSelect
          value={user.timezone ?? SYSTEM_TIME_ZONE}
          onChange={onChangeTimezone}
          disabled={updateProfile.isPending}
        />
      </Stack>
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

export function SettingsPanel({ section, user }: { section: SettingsSectionId; user: MeResponse }) {
  if (section === 'appearance') return <AppearancePanel user={user} />

  if (section === 'account') return <AccountPanel user={user} />

  if (section === 'shortcuts') return <ShortcutSettings />

  if (section === 'notifications') {
    return (
      <div className="flex flex-col gap-4">
        <NotificationChannelCard user={user} />
      </div>
    )
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
