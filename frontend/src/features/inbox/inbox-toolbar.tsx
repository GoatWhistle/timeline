import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'
import { InboxFilterToggle } from './inbox-filter-toggle'

export function InboxToolbar({
  unreadOnly,
  onUnreadOnlyChange,
  selectedCount,
  onClearSelection,
  onMarkAllRead,
  onDeleteAll,
  onDeleteRead,
  markAllReadDisabled,
}: {
  unreadOnly: boolean
  onUnreadOnlyChange: (value: boolean) => void
  selectedCount: number
  onClearSelection: () => void
  onMarkAllRead: () => void
  onDeleteAll: () => void
  onDeleteRead: () => void
  markAllReadDisabled: boolean
}) {
  const { t } = useTranslation('notification')

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <InboxFilterToggle unreadOnly={unreadOnly} onChange={onUnreadOnlyChange} />
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && (
          <>
            <span className="text-caption text-muted-foreground">
              {t('inbox.page.selected', { count: selectedCount })}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
              {t('inbox.page.clearSelection')}
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMarkAllRead}
          disabled={markAllReadDisabled}
        >
          {t('inbox.page.markAllRead')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDeleteRead}>
          {t('inbox.page.deleteRead')}
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={onDeleteAll}>
          {t('inbox.page.deleteAll')}
        </Button>
      </div>
    </div>
  )
}
