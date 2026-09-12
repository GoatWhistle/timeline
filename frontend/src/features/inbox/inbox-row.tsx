import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { InboxItemResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction } from '@/shared/ui/primitives/row-actions'
import { markdownPreview } from './markdown-preview'

function subjectHref(item: InboxItemResponse): string | null {
  if (item.subject?.kind === 'event') return `/events/${item.subject.id}`
  if (item.subject?.kind === 'team') return `/teams/${item.subject.id}`
  return null
}

export function InboxRow({
  item,
  selected,
  onToggleSelect,
  onOpen,
  onMarkRegistered,
  onDelete,
}: {
  item: InboxItemResponse
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onMarkRegistered: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('notification')
  const href = subjectHref(item)
  const unread = !item.read_at
  const hasMarkRegistered = item.actions.some((action) => action.kind === 'MARK_REGISTERED')

  return (
    <div
      data-inbox-row={item.id}
      className={cn(
        'flex items-start gap-3 rounded-surface border border-border p-4',
        unread ? 'bg-card' : 'bg-surface-1',
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={t('inbox.page.select', { title: item.title })}
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn('text-copy', unread && 'font-medium')}>{item.title}</span>
          <time
            className="shrink-0 text-caption text-muted-foreground"
            dateTime={item.created_at}
            title={formatDateTime(item.created_at)}
          >
            {formatRelative(item.created_at)}
          </time>
        </div>
        <p className="mt-1 text-caption text-muted-foreground">{markdownPreview(item.body_md)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {href && (
            <Button asChild variant="outline" size="sm" onClick={onOpen}>
              <Link to={href}>{t('inbox.page.openAction')}</Link>
            </Button>
          )}
          {hasMarkRegistered && (
            <Button type="button" variant="outline" size="sm" onClick={onMarkRegistered}>
              {t('inbox.page.markRegisteredAction')}
            </Button>
          )}
        </div>
      </div>
      <DeleteAction label={t('inbox.page.deleteOne', { title: item.title })} onClick={onDelete} />
    </div>
  )
}
