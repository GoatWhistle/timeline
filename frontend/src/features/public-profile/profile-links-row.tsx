import type { ProfileLink } from '@/shared/api/types.gen'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'

export function ProfileLinksRow({ links }: { links: ProfileLink[] }) {
  if (links.length === 0) return null

  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.id}>
          <ExternalLink
            href={link.url}
            showIcon={false}
            className="text-caption text-muted-foreground hover:text-foreground"
          >
            <ServiceIcon href={link.url} className="text-muted-foreground" />
            <span className="truncate">{link.label || serviceLabel(link.url) || link.url}</span>
          </ExternalLink>
        </li>
      ))}
    </ul>
  )
}
