import { Check, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMarkRegistrationDone } from '@/entities/event/event.queries'
import type { BurningItem } from '@/features/burning/model/burning'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import { Button } from '@/shared/ui/primitives/button'

export function BurningActions({ item }: { item: BurningItem }) {
  const { t } = useTranslation('event')
  const markDone = useMarkRegistrationDone(item.event.id)
  const url = item.event.registration_url ?? null

  async function onMark() {
    try {
      await markDone.mutateAsync()
      toast.success(t('card.marked'), { description: t('card.selfReport') })
    } catch {
      toast.error(t('card.markFailed'))
    }
  }

  return (
    <span className="flex w-28 shrink-0 items-center justify-end gap-1">
      {url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t('burning.action.openForm')}</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('burning.action.openForm')}</TooltipContent>
        </Tooltip>
      )}

      {item.actionable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2"
              disabled={markDone.isPending}
              onClick={() => void onMark()}
            >
              <Check className="size-3.5" aria-hidden="true" />
              <span className="text-caption">{t('burning.action.markShort')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('card.selfReport')}</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
