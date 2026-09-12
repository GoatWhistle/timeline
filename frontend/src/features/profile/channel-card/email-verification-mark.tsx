import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'

export function EmailVerificationMark({ verified }: { verified: boolean }) {
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
