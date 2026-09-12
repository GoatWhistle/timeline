import { CircleQuestionMark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { PalettePrefixList } from './palette-prefix-list'

export function PaletteHelp({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        type="button"
        aria-label={t('palette.help.open')}
        className="flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CircleQuestionMark className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PalettePrefixList className="flex flex-col gap-2" />
      </PopoverContent>
    </Popover>
  )
}
