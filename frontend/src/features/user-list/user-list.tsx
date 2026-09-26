import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { resolveOrder } from '@/entities/catalog/catalog.views'
import { listName } from '@/entities/user/person-name/person-name'
import { useUserColumns } from '@/entities/user/user.columns'
import { useActivateUser, useDeactivateUser, useDeleteUser } from '@/entities/user/user.queries'
import { resolveUserSort, type UserSort } from '@/entities/user/user.views'
import { usersQuery } from '@/shared/api/directory'
import type { AdminUserSummary } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { useLocale } from '@/shared/i18n/i18n-context'
import { RosterFigure } from '@/shared/ui/data-display/empty-figures/people-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { useSearchShortcut } from '../event-list/use-search-shortcut'
import { activeUserFilters, USER_DEFAULTS, userListParams } from './user.params'
import { UserDetailDialog } from './user-detail-dialog'
import { UserTable } from './user-table'
import { UserToolbar } from './user-toolbar'

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [filters, setFilters] = useUrlFilters(USER_DEFAULTS)
  const [page, setPage] = usePageParam()
  const [deleting, setDeleting] = useState<AdminUserSummary | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { columns, toggle: toggleColumn, reset: resetColumns } = useUserColumns()

  const [searchInput, setSearchInput] = useState(filters.query)
  const search = useDebouncedValue(searchInput, 300)

  const sort = resolveUserSort(filters.sort)
  const order = resolveOrder(filters.order)

  const query = useQuery({
    ...usersQuery(userListParams(filters, search, sort, order, page)),
    placeholderData: keepPreviousData,
  })
  const activate = useActivateUser()
  const deactivate = useDeactivateUser()
  const remove = useDeleteUser()

  const items = query.data?.items ?? []
  const filtered = search !== '' || activeUserFilters(filters) > 0
  const selected = filters.selected || null
  const shown = items.find((item) => item.id === selected) ?? null

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'admin-user-list',
  })
  useSearchShortcut(searchRef)

  function changeSort(next: UserSort) {
    if (next === sort) {
      setFilters({ order: order === 'asc' ? 'desc' : 'asc' })
      return
    }
    setFilters({ sort: next, order: 'asc' })
  }

  function resetFilters() {
    setSearchInput('')
    setFilters({ query: undefined, active: undefined, admin: undefined, telegram: undefined })
  }

  return (
    <ThreePane>
      <ListPane>
        <UserToolbar
          filters={filters}
          columns={columns}
          searchValue={searchInput}
          searchRef={searchRef}
          onSearch={(value) => {
            setSearchInput(value)
            setFilters({ query: value || undefined })
          }}
          onFilters={(patch) => setFilters(patch)}
          onResetFilters={resetFilters}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
        />

        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          skeleton={<SkeletonRows rows={10} />}
        >
          {items.length === 0 ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <EmptyState
                title={filtered ? t('users.emptyFiltered') : t('users.empty')}
                figure={RosterFigure}
                filtered={filtered}
                onReset={resetFilters}
              />
            </div>
          ) : (
            <>
              <div className="p-3 sm:p-4">
                <UserTable
                  items={items}
                  columns={columns}
                  selected={selected}
                  sort={sort}
                  order={order}
                  onSelect={(id) => setFilters({ selected: id }, { resetPage: false })}
                  onSort={changeSort}
                />
              </div>
              {query.data && (
                <div className="p-4">
                  <Pagination meta={query.data.meta} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </QueryBoundary>
      </ListPane>

      <UserDetailDialog
        user={shown}
        open={shown !== null}
        onOpenChange={(open) => {
          if (!open) setFilters({ selected: undefined }, { resetPage: false })
        }}
        actions={
          shown && (
            <>
              <Button
                variant="outline"
                disabled={activate.isPending || deactivate.isPending}
                onClick={() => {
                  const action = shown.is_active ? deactivate : activate
                  action
                    .mutateAsync(shown.id)
                    .then(() =>
                      toast.success(
                        shown.is_active ? t('users.deactivatedToast') : t('users.activated'),
                      ),
                    )
                    .catch(() =>
                      toast.error(
                        shown.is_active ? t('users.deactivateFailed') : t('users.activateFailed'),
                      ),
                    )
                }}
              >
                {shown.is_active ? t('users.deactivate') : t('users.activate')}
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(shown)}>
                {t('users.delete')}
              </Button>
            </>
          )
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('users.confirmDeleteTitle')}
        description={
          <>
            {t('users.confirmDeleteHint')}
            <br />
            <strong>{deleting ? listName(deleting, locale) : ''}</strong> · {deleting?.email}
          </>
        }
        confirmLabel={t('users.confirmDeleteLabel')}
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove
            .mutateAsync(deleting.id)
            .then(() => {
              toast.success(t('users.deleted'))
              setFilters({ selected: undefined }, { resetPage: false })
            })
            .catch(() => toast.error(t('users.deleteFailed')))
          setDeleting(null)
        }}
      />
    </ThreePane>
  )
}
