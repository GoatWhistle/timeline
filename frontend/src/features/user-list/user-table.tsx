import { Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CatalogOrder } from '@/entities/catalog/catalog.views'
import { listName } from '@/entities/user/person-name/person-name'
import { USER_COLUMN_KEY, type UserColumn, type UserSort } from '@/entities/user/user.views'
import { UserAvatar } from '@/entities/user/user-avatar'
import type { AdminUserSummary } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  ResizableHead,
  ResizableTable,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Badge } from '@/shared/ui/primitives/badge'

const COLUMN_SORT: Partial<Record<UserColumn, UserSort>> = {
  name: 'name',
  email: 'email',
  created: 'created_at',
}

const COLUMN_WIDTH: Record<UserColumn, number> = {
  name: 240,
  email: 220,
  nickname: 150,
  telegram: 150,
  role: 120,
  state: 130,
  verified: 140,
  created: 130,
  locale: 90,
  timezone: 170,
}

const USERS_WIDTHS_STORAGE_KEY = 'timeline-users-widths'

function Cell({ user, column }: { user: AdminUserSummary; column: UserColumn }) {
  const { t } = useTranslation()

  switch (column) {
    case 'email':
      return <span className="block truncate">{user.email}</span>
    case 'nickname':
      return user.nickname ? <span className="truncate">@{user.nickname}</span> : <NoValue />
    case 'telegram':
      return user.telegram_username ? (
        <span className="truncate">{user.telegram_username}</span>
      ) : (
        <NoValue />
      )
    case 'role':
      return user.is_admin ? (
        <span className="inline-flex max-w-full items-center gap-1.5 align-middle text-foreground">
          <Shield className="size-3.5 shrink-0" aria-hidden="true" />
          {t('users.roleAdmin')}
        </span>
      ) : (
        <span>{t('users.roleMember')}</span>
      )
    case 'state':
      return user.is_active ? (
        <span className="text-muted-foreground">{t('users.active')}</span>
      ) : (
        <Badge tone="danger">{t('users.deactivated')}</Badge>
      )
    case 'verified':
      return user.email_verified_at ? (
        <span>{formatDate(user.email_verified_at)}</span>
      ) : (
        <span className="text-muted-foreground">{t('users.notVerified')}</span>
      )
    case 'created':
      return <span>{formatDate(user.created_at)}</span>
    case 'locale':
      return <span className="uppercase">{user.locale}</span>
    case 'timezone':
      return <span className="truncate">{user.timezone || <NoValue />}</span>
    default:
      return null
  }
}

export function UserTable({
  items,
  columns,
  selected,
  sort,
  order,
  onSelect,
  onSort,
}: {
  items: AdminUserSummary[]
  columns: UserColumn[]
  selected: string | null
  sort: UserSort
  order: CatalogOrder
  onSelect: (id: string) => void
  onSort: (sort: UserSort) => void
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  return (
    <ResizableTable
      storageKey={USERS_WIDTHS_STORAGE_KEY}
      columns={columns.map((column) => ({ id: column, width: COLUMN_WIDTH[column] }))}
      flexible="name"
    >
      <caption className="sr-only">{t('users.title')}</caption>
      <thead>
        <tr className="border-border border-b bg-surface-1">
          {columns.map((column) => {
            const columnSort = COLUMN_SORT[column]
            return (
              <ResizableHead
                key={column}
                column={column}
                label={t(USER_COLUMN_KEY[column])}
                sort={
                  columnSort
                    ? { active: columnSort === sort, order, onSort: () => onSort(columnSort) }
                    : undefined
                }
              />
            )
          })}
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {items.map((user) => (
          <tr
            key={user.id}
            data-user-row={user.id}
            aria-selected={user.id === selected}
            onClick={() => onSelect(user.id)}
            className={cn(
              'cursor-pointer border-border/60 border-b',
              'transition-colors duration-instant ease-out',
              user.id === selected ? 'bg-accent-surface' : 'hover:bg-surface-2',
            )}
          >
            {columns.map((column) =>
              column === 'name' ? (
                <td key={column} data-lead="" className="h-row-roomy px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar
                      seed={user.id}
                      displayName={user.display_name}
                      firstName={user.first_name}
                      lastName={user.last_name}
                      avatarUrl={user.avatar_url}
                    />
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        onSelect(user.id)
                      }}
                      className={cn(
                        'min-w-0 truncate text-left font-medium text-copy',
                        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                      )}
                    >
                      {listName(user, locale)}
                    </button>
                  </span>
                </td>
              ) : (
                <td
                  key={column}
                  className="h-row-roomy truncate px-3 py-2 text-meta text-muted-foreground"
                >
                  <Cell user={user} column={column} />
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </ResizableTable>
  )
}
