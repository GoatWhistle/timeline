import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs } from '@/entities/event/event-color'
import type { EventColor } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

export function CatalogCover({
  coverUrl,
  color,
  className,
}: {
  coverUrl: string | null | undefined
  color: EventColor | null | undefined
  className?: string
}) {
  const { t } = useTranslation('event')
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(coverUrl) && !broken

  return (
    <span
      {...eventColorAttrs(color)}
      data-catalog-cover=""
      className={cn(
        'relative block aspect-[16/9] w-full shrink-0 overflow-hidden rounded-control',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-control after:border',
        showImage ? 'bg-event-fill after:border-event-tint/30' : 'bg-muted after:border-border',
        className,
      )}
    >
      {showImage ? (
        <img
          src={coverUrl ?? ''}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className={cn(
            'h-full w-full object-cover',
            'motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-out',
            'motion-safe:group-hover:scale-[1.03]',
          )}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-caption text-muted-foreground">
          {t('catalog.card.noCover')}
        </span>
      )}
    </span>
  )
}
