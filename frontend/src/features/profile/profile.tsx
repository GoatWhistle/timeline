import { useTranslation } from 'react-i18next'
import { useSession } from '@/shared/api/session'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { AccountActionsCard } from './account-actions-card/account-actions-card'
import { AccountIdentityCard } from './account-identity-card/account-identity-card'
import { EmailChangeCard } from './email-change-card/email-change-card'
import { NicknameCard } from './nickname-card/nickname-card'
import { NotificationChannelCard } from './notification-channel-card/notification-channel-card'
import { PersonalDataCard } from './personal-data-card/personal-data-card'
import { TelegramLinkCard } from './telegram-link-card/telegram-link-card'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, isLoading } = useSession()

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <QueryBoundary
        isPending={isLoading || !user}
        hasData={!isLoading && user !== undefined && user !== null}
        skeleton={<SkeletonDetail />}
      >
        {user && (
          <div className="flex flex-col gap-6">
            <PersonalDataCard
              firstName={user.first_name ?? ''}
              middleName={user.middle_name}
              lastName={user.last_name ?? ''}
              legacyDisplayName={user.legacy_display_name}
            />
            <NicknameCard nickname={user.nickname} profilePublic={user.profile_public} />
            <AccountIdentityCard user={user} />
            <NotificationChannelCard user={user} />
            <TelegramLinkCard user={user} />
            <EmailChangeCard pendingEmail={user.pending_email} />
            <AccountActionsCard />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
