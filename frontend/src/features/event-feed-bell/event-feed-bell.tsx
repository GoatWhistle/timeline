import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  eventFeedQueryOptions,
  unreadCountQueryOptions,
  useMarkFeedRead,
} from '@/entities/event-feed/event-feed.queries'
import type { SystemEventResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import styles from './event-feed-bell.module.css'

export function EventFeedBell() {
  const { t } = useTranslation('notification')
  const counter = useQuery(unreadCountQueryOptions)
  const feed = useQuery(eventFeedQueryOptions(false))
  const markRead = useMarkFeedRead()

  const unread = counter.data?.unread ?? 0
  const items = feed.data?.items ?? []

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('feed.open')}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-[8px]',
          'transition-colors duration-instant hover:bg-surface-3',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span className={styles.badge} aria-live="polite">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn('z-50 w-80 rounded-[10px] border border-border bg-surface-1 p-2 shadow-lg')}
        >
          <div className={styles.header}>
            <span className="font-medium text-copy">{t('feed.title')}</span>
            {unread > 0 && (
              <button type="button" className={styles.markAll} onClick={() => markRead.mutate([])}>
                {t('feed.markAllRead')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className={styles.empty}>{t('feed.empty')}</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item: SystemEventResponse) => (
                <li key={item.id} className={cn(styles.item, !item.read && styles.itemUnread)}>
                  <span className={styles.itemType}>
                    {String(t(`feed.type.${item.type}`, { defaultValue: item.type }))}
                  </span>
                  <time className={styles.itemTime} dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
