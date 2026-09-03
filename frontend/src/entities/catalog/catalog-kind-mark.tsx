import { useTranslation } from 'react-i18next'
import { EVENT_KIND_ICON, EVENT_KIND_KEY } from '@/entities/event/event-kind'
import type { EventKind } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

export function CatalogKindMark({
  kind,
  labelled = true,
  className,
}: {
  kind: EventKind
  labelled?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = EVENT_KIND_ICON[kind]

  return (
    <span className={cn('inline-flex shrink-0 items-center text-muted-foreground', className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {labelled ? <span className="sr-only">{t(EVENT_KIND_KEY[kind])}</span> : null}
    </span>
  )
}
