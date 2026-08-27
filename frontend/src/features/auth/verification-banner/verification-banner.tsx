import { MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { useResendVerification } from '@/entities/session/session.queries'
import { useSession } from '@/shared/api/session'
import { Button } from '@/shared/ui/primitives/button'

export function VerificationBanner() {
  const { user } = useSession()
  const resend = useResendVerification()

  if (!user || user.email_verified) return null

  return (
    <div
      role="status"
      className="mb-6 flex items-center justify-between gap-4 rounded-md border border-status-todo/40 bg-status-todo/10 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <MailWarning className="size-4 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          Адрес <strong>{user.email}</strong> не подтверждён. Напоминания на почту приходить не
          будут.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={resend.isPending}
        onClick={() =>
          resend
            .mutateAsync({ email: user.email })
            .then(() => toast.success('Письмо отправлено повторно'))
            .catch(() => toast.error('Не удалось отправить письмо'))
        }
      >
        Отправить повторно
      </Button>
    </div>
  )
}
