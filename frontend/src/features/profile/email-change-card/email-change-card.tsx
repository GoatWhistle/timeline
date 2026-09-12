import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChannelCard } from '@/features/profile/channel-card/channel-card'
import { channelState } from '@/features/profile/channel-card/channel-state'
import { EmailVerificationMark } from '@/features/profile/channel-card/email-verification-mark'
import { Button } from '@/shared/ui/primitives/button'
import { EmailChangeForm } from './email-change-form'

export function EmailChangeCard({
  email,
  emailVerified,
  pendingEmail,
}: {
  email: string
  emailVerified: boolean
  pendingEmail?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const state = channelState({
    linked: emailVerified,
    pending: Boolean(pendingEmail) || !emailVerified,
  })

  return (
    <ChannelCard
      title={t('profile.emailTitle')}
      hint={t('profile.emailHint')}
      mark={<Mail className="size-4 text-muted-foreground" aria-hidden="true" />}
      state={state}
      value={pendingEmail ? `${email} → ${pendingEmail}` : email}
      valueMark={<EmailVerificationMark verified={emailVerified} />}
      action={
        <Button
          variant={open ? 'outline' : 'default'}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? t('action.cancel') : t('account.emailChange')}
        </Button>
      }
    >
      {open ? <EmailChangeForm onSent={() => setOpen(false)} /> : null}
    </ChannelCard>
  )
}
