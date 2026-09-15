import { ArrowDown, ArrowUp, ChevronsUpDown, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CatalogOrder } from '@/entities/catalog/catalog.views'
import { listName } from '@/entities/user/person-name/person-name'
import { USER_COLUMN_KEY, type UserColumn, type UserSort } from '@/entities/user/user.views'
import { UserAvatar } from '@/entities/user/user-avatar'
import type { AdminUserSummary } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Badge } from '@/shared/ui/primitives/badge'

const COLUMN_SORT: Partial<Record<UserColumn, UserSort>> = {
  name: 'name',
  email: 'email',
  created: 'created_at',
}

const COLUMN_WIDTH: Record<UserColumn, string> = {
  name: 'w-full',
  email: 'w-px whitespace-nowrap',
  nickname: 'w-px whitespace-nowrap',
  telegram: 'w-px whitespace-nowrap',
  role: 'w-px whitespace-nowrap',
  state: 'w-px whitespace-nowrap',
  verified: 'w-px whitespace-nowrap',
  created: 'w-px whitespace-nowrap',
  locale: 'w-px whitespace-nowrap',
  timezone: 'w-px whitespace-nowrap',
}

function SortIcon({ active, order }: { active: boolean; order: CatalogOrder }) {
  if (!active) {
    return <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden="true" />
  }
  const Icon = order === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3 shrink-0" aria-hidden="true" />
}

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
        <span className="flex items-center gap-1.5 text-foreground">
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
    <div className="w-full overflow-x-auto rounded-surface border">
      <table className="w-full border-collapse text-copy">
        <caption className="sr-only">{t('users.title')}</caption>
        <thead>
          <tr className="border-border border-b bg-surface-1">
            {columns.map((column) => {
              const columnSort = COLUMN_SORT[column]
              const active = columnSort !== undefined && columnSort === sort
              return (
                <th
                  key={column}
                  scope="col"
                  aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'h-row px-3 text-left align-middle font-medium text-meta text-muted-foreground',
                    'pointer-coarse:h-11',
                    COLUMN_WIDTH[column],
                  )}
                >
                  {columnSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(columnSort)}
                      className={cn(
                        'inline-flex items-center gap-1',
                        TOUCH_REACH,
                        'transition-colors duration-instant ease-out',
                        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                        active ? 'text-foreground' : 'hover:text-foreground',
                      )}
                    >
                      {t(USER_COLUMN_KEY[column])}
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    t(USER_COLUMN_KEY[column])
                  )}
                </th>
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
                  <td key={column} className="w-full max-w-0 px-3 py-2">
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
                    className={cn(
                      'px-3 py-2 text-meta text-muted-foreground',
                      COLUMN_WIDTH[column],
                    )}
                  >
                    <Cell user={user} column={column} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
