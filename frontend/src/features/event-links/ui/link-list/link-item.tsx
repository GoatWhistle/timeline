import { useTranslation } from 'react-i18next'
import { LINK_KIND_COLOR, LINK_KIND_ICON, LINK_KIND_KEY } from '@/entities/link/link.labels'
import type { LinkKind } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'

export type LinkItemProps = {
  kind: LinkKind
  url: string
  title?: string | null
  className?: string
}

export function LinkItem({ kind, url, title, className }: LinkItemProps) {
  const { t } = useTranslation()
  const Icon = LINK_KIND_ICON[kind]
  const label = title?.trim() ? title : t(LINK_KIND_KEY[kind])

  return (
    <ExternalLink
      className={cn('gap-2 text-copy hover:underline', className)}
      href={url}
      showIcon={false}
    >
      <Icon className={cn('size-4 shrink-0', LINK_KIND_COLOR[kind])} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </ExternalLink>
  )
}
