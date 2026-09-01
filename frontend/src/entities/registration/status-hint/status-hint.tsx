import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUS_SHAPE,
} from '@/entities/registration/registration.labels'
import type { RegistrationStatusValue } from '@/shared/api/types.gen'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'

export function StatusWithHint({ status }: { status: RegistrationStatusValue }) {
  const { t } = useTranslation()
  const hint = t(`registration:statusHint.${status}`)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-status-hint={status}
            aria-label={hint}
            className="inline-flex items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Badge tone="outline">
              <Dot
                shape={REGISTRATION_STATUS_SHAPE[status]}
                className={REGISTRATION_STATUS_COLOR[status]}
              />
              {t(REGISTRATION_STATUS_KEY[status])}
              <Info className="size-3 text-muted-foreground" aria-hidden="true" />
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
