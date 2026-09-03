import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'

export function CatalogJoinedMark({ className }: { className?: string }) {
  const { t } = useTranslation('event')
  const label = t('catalog.joined')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex shrink-0 items-center text-joined', className)}>
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
