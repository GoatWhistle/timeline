import { useTranslation } from 'react-i18next'
import { LINK_KIND_ICON, LINK_KIND_KEY } from '@/entities/link/link.labels'
import type { ResourceLink } from '@/shared/api/types.gen'

export type StageScopedLink = Pick<ResourceLink, 'id' | 'kind'> & {
  stage_id?: string
  title?: string
}

export function stageLinksOf<T extends { stage_id?: string }>(links: T[], stageId: string): T[] {
  return links.filter((link) => link.stage_id === stageId)
}

export function StageLinks({ links }: { links: StageScopedLink[] }) {
  const { t } = useTranslation()

  if (links.length === 0) return null

  return (
    <div className="mt-1 flex flex-col gap-0.5 border-border border-t pt-1">
      {links.map((link) => {
        const Icon = LINK_KIND_ICON[link.kind]
        const label = link.title?.trim() ? link.title : t(LINK_KIND_KEY[link.kind])
        return (
          <span key={link.id} className="flex items-center gap-1.5 text-caption">
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </span>
        )
      })}
    </div>
  )
}
