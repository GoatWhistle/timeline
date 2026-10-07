import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function CoverMissing({
  className,
  labelled = true,
}: {
  className?: string
  labelled?: boolean
}) {
  const { t } = useTranslation('event')
  const label = t('catalog.card.noCover')

  return (
    <div
      role="img"
      aria-label={label}
      data-cover-missing=""
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted px-4 py-6 text-center',
        className,
      )}
    >
      {labelled ? (
        <span aria-hidden="true" className="text-caption text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  )
}
