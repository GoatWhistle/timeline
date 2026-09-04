import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  BrandMark,
  DashedRect,
  FigureFrame,
} from '@/shared/ui/data-display/empty-figures/figure-frame'

function CoverMissingFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label} className="h-full max-h-24 w-auto">
      <DashedRect x={16} y={14} width={168} height={76} rx={10} />
      <BrandMark />
    </FigureFrame>
  )
}

export function CoverMissing({
  className,
  labelled = true,
}: {
  className?: string
  labelled?: boolean
}) {
  const { t } = useTranslation('event')
  const label = t('cover.missing')

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-4 py-6 text-center',
        className,
      )}
    >
      <CoverMissingFigure label={label} />
      {labelled ? <p className="text-caption text-foreground">{label}</p> : null}
    </div>
  )
}
