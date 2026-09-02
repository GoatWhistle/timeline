import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { CoverMissing } from './cover-missing'

export function EventCover({
  coverUrl,
  title,
  className,
  labelled = true,
}: {
  coverUrl?: string | null
  title: string
  className?: string
  labelled?: boolean
}) {
  const { t } = useTranslation('event')
  const [broken, setBroken] = useState(false)

  return (
    <div className={cn('relative overflow-hidden rounded-surface border bg-muted', className)}>
      {coverUrl && !broken ? (
        <img
          src={coverUrl}
          alt={t('cover.alt', { title })}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <CoverMissing labelled={labelled} />
      )}
    </div>
  )
}
