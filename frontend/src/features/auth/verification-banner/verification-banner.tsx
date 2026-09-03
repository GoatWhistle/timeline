import { MailWarning } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useResendVerification } from '@/entities/session/session.queries'
import { useSession } from '@/shared/api/session'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'

const STORAGE_KEY = 'timeline.verification-banner.dismissed'

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeDismissed(email: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, email)
  } catch {}
}

export function VerificationBanner() {
  const { t } = useTranslation('auth')
  const { user } = useSession()
  const resend = useResendVerification()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!user || user.email_verified) return null
  if (dismissed === user.email) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-3 rounded-control border border-border bg-surface-1 px-3 py-2"
    >
      <MailWarning className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
        {t('banner.addressPrefix')} <strong className="text-foreground">{user.email}</strong>{' '}
        {t('banner.unverified')}
      </p>
      <Button
        variant="ghost"
        size="sm"
        disabled={resend.isPending}
        onClick={() =>
          resend
            .mutateAsync({ email: user.email })
            .then(() => toast.success(t('banner.resent')))
            .catch(() => toast.error(t('verify.sendFailed')))
        }
      >
        {t('banner.resend')}
      </Button>
      <CloseButton
        label={t('banner.dismiss')}
        title={t('banner.dismiss')}
        onClick={() => {
          writeDismissed(user.email)
          setDismissed(user.email)
        }}
      />
    </div>
  )
}
