import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs } from '@/entities/event/event-color'
import type { EventColor } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

export function CatalogCover({
  coverUrl,
  color,
  initial,
  className,
}: {
  coverUrl: string | null | undefined
  color: EventColor | null | undefined
  initial: string
  className?: string
}) {
  const { t } = useTranslation('event')
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(coverUrl) && !broken

  return (
    <span
      {...eventColorAttrs(color)}
      className={cn(
        'relative block w-full overflow-hidden rounded-control bg-event-fill',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-control',
        'after:border after:border-event-tint/30',
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
        <span className="flex h-full w-full items-center justify-center bg-event-fill-strong">
          <span aria-hidden="true" className="font-semibold text-event-tint text-screen uppercase">
            {initial}
          </span>
          <span className="sr-only">{t('catalog.card.noCover')}</span>
        </span>
      )}
    </span>
  )
}
