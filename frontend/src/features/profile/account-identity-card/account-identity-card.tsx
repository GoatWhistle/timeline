import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MeResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'

function EmailVerificationMark({ verified }: { verified: boolean }) {
  const { t } = useTranslation()
  const label = verified ? t('account.emailVerifiedMark') : t('account.emailUnverifiedMark')
  const Mark = verified ? BadgeCheck : TriangleAlert

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            title={label}
            data-email-verified={verified}
            className={cn(
              'inline-flex shrink-0 cursor-default rounded-pill',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              verified ? 'text-primary' : 'text-destructive',
            )}
          >
            <Mark className="size-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AccountIdentityCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.identityTitle')}</CardTitle>
        <CardDescription>{t('account.identityHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">{t('account.email')}</span>
          <span className="min-w-0 break-all font-medium text-copy">{user.email}</span>
          <EmailVerificationMark verified={user.email_verified} />
        </div>

        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="text-meta text-muted-foreground">{t('account.role')}</dt>
          <dd className="text-copy">
            {user.is_admin ? t('account.roleAdmin') : t('account.roleMember')}
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}
