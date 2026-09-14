import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  inboxPreviewQueryOptions,
  inboxUnreadCountQueryOptions,
} from '@/entities/inbox/inbox.queries'
import { markdownPreview } from '@/features/inbox/markdown-preview'
import type { InboxItemResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import styles from './inbox-bell.module.css'

const SUBJECT_ROUTES: Record<string, string> = { event: '/events', team: '/teams' }

function itemHref(item: InboxItemResponse): string {
  const open = item.actions.find((action) => action.kind === 'OPEN')
  const target = open?.href ?? item.subject?.id
  const base = item.subject?.kind ? SUBJECT_ROUTES[item.subject.kind] : undefined
  if (!target || !base) return '/inbox'
  return `${base}/${target}`
}

function InboxBellItem({ item }: { item: InboxItemResponse }) {
  const preview = markdownPreview(item.body_md)
  return (
    <DropdownMenu.Item asChild>
      <Link to={itemHref(item)} className={cn(styles.item, !item.read_at && styles.itemUnread)}>
        <span className={styles.itemHead}>
          <span className={styles.itemTitle}>{item.title}</span>
          <time
            className={styles.itemTime}
            dateTime={item.created_at}
            title={formatDateTime(item.created_at)}
          >
            {formatRelative(item.created_at)}
          </time>
        </span>
        {preview && <span className={styles.itemBody}>{preview}</span>}
      </Link>
    </DropdownMenu.Item>
  )
}

export function InboxBell({ touch = false }: { touch?: boolean }) {
  const { t } = useTranslation('notification')
  const counter = useQuery(inboxUnreadCountQueryOptions)
  const preview = useQuery(inboxPreviewQueryOptions())

  const unread = counter.data?.unread ?? 0
  const items = preview.data?.items ?? []

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('inbox.bell.open')}
        className={cn(
          'relative flex items-center justify-center rounded-control',
          touch ? 'size-tap' : 'h-8 w-8',
          'transition-colors duration-instant hover:bg-surface-2',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <Bell className={touch ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
        {unread > 0 && (
          <span className={styles.badge} aria-live="polite">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={cn(FLOATING_SURFACE, FLOATING_MOTION, 'w-96 max-w-[calc(100vw-2rem)] p-1')}
        >
          <div className={styles.header}>
            <span className={styles.title}>{t('inbox.bell.title')}</span>
          </div>
          {preview.isError ? (
            <p className={styles.empty}>{t('inbox.bell.loadFailed')}</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>{t('inbox.bell.empty')}</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <InboxBellItem item={item} />
                </li>
              ))}
            </ul>
          )}
          <DropdownMenu.Item asChild>
            <Link to="/inbox" className={styles.viewAll}>
              {t('inbox.bell.viewAll')}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
