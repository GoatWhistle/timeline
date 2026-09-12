import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  inboxQueryOptions,
  useDeleteInbox,
  useDeleteInboxItem,
  useMarkInboxRead,
  useMarkInboxRegistered,
  useRestoreInboxItem,
} from '@/entities/inbox/inbox.queries'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { catalogEntry } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import { HistoryFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { groupByDay } from './inbox-day-groups'
import { InboxDayHeader } from './inbox-day-header'
import { InboxRow } from './inbox-row'
import { InboxToolbar } from './inbox-toolbar'

type PendingConfirm = 'all' | 'read' | null

export function InboxPage() {
  const { t } = useTranslation('notification')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<PendingConfirm>(null)

  const query = useQuery(inboxQueryOptions({ unread: unreadOnly, pageSize: 100 }))
  const markRead = useMarkInboxRead()
  const deleteItem = useDeleteInboxItem()
  const restoreItem = useRestoreInboxItem()
  const deleteInbox = useDeleteInbox()
  const markRegistered = useMarkInboxRegistered()

  const items = query.data?.items ?? []
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const groups = useMemo(() => groupByDay(items), [items])
  const unreadCount = items.filter((item) => !item.read_at).length

  useListNavigation({
    ids,
    selected: active,
    onSelect: setActive,
    onClear: () => setActive(null),
    scopeId: 'inbox',
    rowAttr: 'data-inbox-row',
  })

  const toggleSelect = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectShortcut = useMemo<ShortcutDefinition[]>(
    () => [
      {
        ...catalogEntry('list-select'),
        when: () => active !== null,
        run: () => toggleSelect(active as string),
      },
    ],
    [active, toggleSelect],
  )
  useShortcutScope('inbox-select', selectShortcut)

  function deleteWithUndo(id: string, title: string) {
    deleteItem.mutate(id, {
      onSuccess: () => {
        toast(t('inbox.page.deleted'), {
          description: title,
          action: {
            label: t('inbox.page.undo'),
            onClick: () => {
              restoreItem.mutate(id, {
                onError: () => toast.error(t('inbox.page.undoFailed')),
              })
            },
          },
        })
      },
    })
  }

  function runMarkAllRead() {
    markRead.mutate([])
  }

  function runDeleteAll() {
    deleteInbox.mutate({ readOnly: false })
    setConfirming(null)
    setSelected(new Set())
  }

  function runDeleteRead() {
    deleteInbox.mutate({ readOnly: true })
    setConfirming(null)
    setSelected(new Set())
  }

  if (query.isPending) {
    return <div className="p-8 text-muted-foreground">{t('common:state.loading')}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-semibold text-heading">{t('inbox.page.title')}</h1>
      <InboxToolbar
        unreadOnly={unreadOnly}
        onUnreadOnlyChange={setUnreadOnly}
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        onMarkAllRead={runMarkAllRead}
        onDeleteAll={() => setConfirming('all')}
        onDeleteRead={() => setConfirming('read')}
        markAllReadDisabled={unreadCount === 0}
      />

      {items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? t('inbox.page.emptyUnreadTitle') : t('inbox.page.emptyTitle')}
          description={unreadOnly ? t('inbox.page.emptyUnreadHint') : t('inbox.page.emptyHint')}
          figure={HistoryFigure}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <InboxDayHeader date={group.date} />
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <InboxRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onOpen={() => markRead.mutate([item.id])}
                    onMarkRegistered={() =>
                      markRegistered.mutate(item.id, {
                        onSuccess: () => toast.success(t('inbox.page.markRegisteredDone')),
                        onError: () => toast.error(t('inbox.page.markRegisteredFailed')),
                      })
                    }
                    onDelete={() => deleteWithUndo(item.id, item.title)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirming === 'all'}
        onOpenChange={(open) => setConfirming(open ? 'all' : null)}
        title={t('inbox.page.deleteAllConfirmTitle')}
        description={t('inbox.page.deleteAllConfirmHint')}
        destructive
        onConfirm={runDeleteAll}
      />
      <ConfirmDialog
        open={confirming === 'read'}
        onOpenChange={(open) => setConfirming(open ? 'read' : null)}
        title={t('inbox.page.deleteReadConfirmTitle')}
        description={t('inbox.page.deleteReadConfirmHint')}
        destructive
        onConfirm={runDeleteRead}
      />
    </div>
  )
}
