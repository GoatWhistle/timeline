import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ProfileLink } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { linkHostname } from '@/shared/ui/navigation/service-link/detect-service'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

export type ProfileLinkRowProps = {
  link: ProfileLink
  index: number
  total: number
  isDragged: boolean
  isEditing: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

export function ProfileLinkRow({
  link,
  index,
  total,
  isDragged,
  isEditing,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: ProfileLinkRowProps) {
  const { t } = useTranslation()
  const host = linkHostname(link.url) ?? link.url
  const service = serviceLabel(link.url)
  const name = link.label ?? service ?? host
  const position = t('profile.links.position', { current: index + 1, total })

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      aria-label={`${name}, ${position}`}
      className={cn(
        'flex items-center gap-2 rounded-control border border-border bg-card p-2',
        'motion-safe:transition-colors motion-safe:duration-base motion-safe:ease-out',
        isDragged && 'opacity-60 ring-1 ring-primary',
        isEditing && 'border-primary bg-accent-surface',
      )}
    >
      <GripVertical
        className="size-4 shrink-0 cursor-grab text-muted-foreground"
        aria-hidden="true"
      />
      <ServiceIcon href={link.url} className="text-muted-foreground" />

      <span className="min-w-0 flex-1">
        <ExternalLink className="text-primary hover:underline" href={link.url}>
          <span className="truncate">{name}</span>
        </ExternalLink>
        <span className="block truncate text-meta text-muted-foreground">{host}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={index === 0}
        onClick={onMoveUp}
        data-focus-id={link.id}
        aria-label={t('profile.links.moveUp', { name })}
      >
        <ChevronUp className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={index === total - 1}
        onClick={onMoveDown}
        aria-label={t('profile.links.moveDown', { name })}
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </Button>
      <EditAction
        onClick={onEdit}
        aria-pressed={isEditing}
        label={t('profile.links.edit', { name })}
      />
      <DeleteAction onClick={onRemove} label={t('profile.links.remove', { name })} />
    </li>
  )
}
