import { useTranslation } from 'react-i18next'
import { useSession } from '@/shared/api/session'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { AccountActionsCard } from './account-actions-card/account-actions-card'
import { EmailChangeCard } from './email-change-card/email-change-card'
import { NotificationChannelCard } from './notification-channel-card/notification-channel-card'
import { PersonalDataCard } from './personal-data-card/personal-data-card'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, isLoading } = useSession()

  if (isLoading || !user) return <LoadingState />

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <div className="flex flex-col gap-6">
        <PersonalDataCard displayName={user.display_name ?? ''} />
        <NotificationChannelCard user={user} />
        <EmailChangeCard pendingEmail={user.pending_email} />
        <AccountActionsCard />
      </div>
    </div>
  )
}
