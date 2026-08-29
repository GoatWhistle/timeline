import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { DeviceList } from '@/features/device-list/device-list'
import { AccountActionsCard } from '@/features/profile/account-actions-card/account-actions-card'
import { EmailChangeCard } from '@/features/profile/email-change-card/email-change-card'
import { NotificationChannelCard } from '@/features/profile/notification-channel-card/notification-channel-card'
import { PersonalDataCard } from '@/features/profile/personal-data-card/personal-data-card'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'
import { LanguageToggle } from '@/shared/ui/primitives/language-toggle'
import { ThemeToggle } from '@/shared/ui/primitives/theme-toggle'
import { TimezoneSelect } from '@/shared/ui/primitives/timezone-select/timezone-select'
import type { SettingsSectionId } from './sections'

function Row({ title, hint, control }: { title: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-4">
      <div className="min-w-0 max-w-prose">
        <p className="font-medium text-copy">{title}</p>
        <p className="mt-0.5 text-meta text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export function AppearancePanel({ user }: { user: MeResponse }) {
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
      <Row title={t('settings.theme')} hint={t('settings.themeHint')} control={<ThemeToggle />} />
      <Row
        title={t('language.label')}
        hint={t('settings.languageHint')}
        control={<LanguageToggle />}
      />
      <Row
        title={t('settings.timezone')}
        hint={t('settings.timezoneHint')}
        control={
          <TimezoneSelect
            value={user.timezone ?? SYSTEM_TIME_ZONE}
            onChange={onChangeTimezone}
            disabled={updateProfile.isPending}
          />
        }
      />
    </div>
  )
}

export function SettingsPanel({ section, user }: { section: SettingsSectionId; user: MeResponse }) {
  if (section === 'appearance') return <AppearancePanel user={user} />

  if (section === 'notifications') {
    return (
      <div className="flex flex-col gap-4">
        <NotificationChannelCard user={user} />
      </div>
    )
  }

  if (section === 'danger') {
    return (
      <div className="flex flex-col gap-4">
        <DeviceList />
        <AccountActionsCard />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PersonalDataCard displayName={user.display_name ?? ''} />
      <ProfileLinksCard user={user} />
      <EmailChangeCard pendingEmail={user.pending_email} />
    </div>
  )
}
