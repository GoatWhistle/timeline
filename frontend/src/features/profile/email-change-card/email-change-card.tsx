import { BadgeCheck, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useResendVerification } from '@/entities/session/session.queries'
import { ChannelCard } from '@/features/profile/channel-card/channel-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
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
  const resend = useResendVerification()

  async function onVerify() {
    try {
      await resend.mutateAsync({ email })
      toast.success(t('account.emailVerifySent'), { description: t('account.emailVerifyHint') })
    } catch {
      toast.error(t('account.emailVerifyFailed'))
    }
  }

  return (
    <>
      <ChannelCard
        title={t('profile.emailTitle')}
        mark={<Mail className="size-4 text-muted-foreground" aria-hidden="true" />}
        value={email}
        valueMark={
          emailVerified ? (
            <BadgeCheck
              className="size-4 shrink-0 text-primary"
              aria-label={t('account.emailVerifiedMark')}
            />
          ) : null
        }
        note={pendingEmail ? `${t('profile.emailPending')} ${pendingEmail}` : null}
        action={
          <>
            {emailVerified ? null : (
              <Button disabled={resend.isPending} onClick={() => void onVerify()}>
                {t('account.emailVerify')}
              </Button>
            )}
            <Button onClick={() => setOpen(true)}>{t('account.emailChange')}</Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.emailDialogTitle')}</DialogTitle>
          </DialogHeader>
          <EmailChangeForm onSent={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
