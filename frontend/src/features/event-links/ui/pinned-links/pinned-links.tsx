import { useQuery } from '@tanstack/react-query'
import { Pin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { eventLinksQuery } from '@/entities/link/link.queries'
import { LinkItem } from '@/features/event-links/ui/link-list/link-item'

export function PinnedLinks({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const { data } = useQuery(eventLinksQuery(eventId))
  const pinned = (data?.items ?? []).filter((link) => link.is_pinned)

  if (pinned.length === 0) return null

  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t('links.pinned')}>
      <span className="inline-flex items-center gap-1 text-meta text-muted-foreground">
        <Pin className="size-3.5" aria-hidden="true" />
        {t('links.pinned')}
      </span>
      {pinned.map((link) => (
        <LinkItem key={link.id} kind={link.kind} url={link.url} title={link.title} />
      ))}
    </nav>
  )
}
