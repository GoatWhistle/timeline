import { useTranslation } from 'react-i18next'
import type { EventKind } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

const EVENT_KIND_KEY: Record<EventKind, string> = {
  HACKATHON: 'catalog.kindLabel.HACKATHON',
  MEETUP: 'catalog.kindLabel.MEETUP',
}

export function CatalogKindMark({ kind, className }: { kind: EventKind; className?: string }) {
  const { t } = useTranslation('event')

  return (
    <span className={cn('inline-flex shrink-0 items-center', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'bg-state-upcoming',
          kind === 'MEETUP' ? 'size-2 rotate-45 rounded-[1px]' : 'h-1.5 w-4 rounded-[2px]',
        )}
      />
      <span className="sr-only">{t(EVENT_KIND_KEY[kind])}</span>
    </span>
  )
}
