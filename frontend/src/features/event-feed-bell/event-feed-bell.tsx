import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  eventFeedQueryOptions,
  unreadCountQueryOptions,
  useMarkFeedRead,
} from '@/entities/event-feed/event-feed.queries'
import type { SystemEventResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'
import styles from './event-feed-bell.module.css'

function MarkAllRead({ onMark }: { onMark: () => void }) {
  const { t } = useTranslation('notification')
  const label = t('feed.markAllRead')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu.Item
            aria-label={label}
            title={label}
            data-feed-mark-all
            className={styles.markAll}
            onSelect={onMark}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
          </DropdownMenu.Item>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

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
          'relative flex h-8 w-8 items-center justify-center rounded-control',
          'transition-colors duration-instant hover:bg-surface-2',
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
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={cn(FLOATING_SURFACE, FLOATING_MOTION, 'w-72 p-1')}
        >
          <div className={styles.header}>
            <span className={styles.title}>{t('feed.title')}</span>
            {unread > 0 && <MarkAllRead onMark={() => markRead.mutate([])} />}
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
                  <time
                    className={styles.itemTime}
                    dateTime={item.created_at}
                    title={formatDateTime(item.created_at)}
                  >
                    {formatRelative(item.created_at)}
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
