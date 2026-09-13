import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { eventLinksQuery } from '@/entities/link/link.queries'
import type { ResourceLink, StageResponse } from '@/shared/api/types.gen'
import { LinkItem } from './link-item'

function stageName(stages: StageResponse[], stageId: string): string | undefined {
  return stages.find((stage) => stage.id === stageId)?.name
}

export function LinkList({ eventId, stages = [] }: { eventId: string; stages?: StageResponse[] }) {
  const { t } = useTranslation('event')
  const { data, isError } = useQuery(eventLinksQuery(eventId))
  const items: ResourceLink[] = data?.items ?? []

  if (isError) {
    return <p className="text-meta text-muted-foreground">{t('links.loadFailed')}</p>
  }

  if (items.length === 0) {
    return <p className="text-meta text-muted-foreground">{t('links.empty')}</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((link) => (
        <li key={link.id} className="flex items-baseline gap-2">
          <LinkItem kind={link.kind} url={link.url} title={link.title} />
          {link.stage_id && (
            <span className="text-caption text-muted-foreground">
              {stageName(stages, link.stage_id) ?? t('links.stageScoped')}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
