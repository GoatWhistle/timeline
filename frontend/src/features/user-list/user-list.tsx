import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { listName } from '@/entities/user/person-name/person-name'
import { useActivateUser, useDeactivateUser, useDeleteUser } from '@/entities/user/user.queries'
import { usersQuery } from '@/shared/api/directory'
import type { UserSummary } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { useLocale } from '@/shared/i18n/i18n-context'
import { RosterFigure } from '@/shared/ui/data-display/empty-figures/people-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Input } from '@/shared/ui/forms/input'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'

const DEFAULTS = { query: '' }

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [searchInput, setSearchInput] = useState(filters.query)
  const search = useDebouncedValue(searchInput, 300)

  const [deleting, setDeleting] = useState<UserSummary | null>(null)
  const filtered = search !== ''

  function resetFilters() {
    setSearchInput('')
    setFilters({ query: undefined })
  }

  const query = useQuery(usersQuery({ page, ...(search ? { query: search } : {}) }))
  const activate = useActivateUser()
  const deactivate = useDeactivateUser()
  const remove = useDeleteUser()

  return (
    <div>
      <PageHeader title={t('users.title')} description={t('users.description')} />

      <div className="mb-4 w-80">
        <Input
          aria-label={t('users.searchAria')}
          placeholder={t('users.searchPlaceholder')}
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setFilters({ query: event.target.value || undefined })
          }}
        />
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={10} columns={4} density="action" />}
      >
        {query.data?.items.length === 0 ? (
          <EmptyState
            title={filtered ? t('users.emptyFiltered') : t('users.empty')}
            figure={RosterFigure}
            filtered={filtered}
            onReset={resetFilters}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.columnName')}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{t('users.columnState')}</TableHead>
                  <TableHead className="w-72">{t('users.columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{listName(item, locale)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.email}</TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge tone="primary">{t('users.active')}</Badge>
                      ) : (
                        <Badge tone="danger">{t('users.deactivated')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deactivate.isPending}
                            onClick={() =>
                              deactivate
                                .mutateAsync(item.id)
                                .then(() => toast.success(t('users.deactivatedToast')))
                                .catch(() => toast.error(t('users.deactivateFailed')))
                            }
                          >
                            {t('users.deactivate')}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activate.isPending}
                            onClick={() =>
                              activate
                                .mutateAsync(item.id)
                                .then(() => toast.success(t('users.activated')))
                                .catch(() => toast.error(t('users.activateFailed')))
                            }
                          >
                            {t('users.activate')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                          {t('users.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
          </div>
        )}
      </QueryBoundary>

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
            .then(() => toast.success(t('users.deleted')))
            .catch(() => toast.error(t('users.deleteFailed')))
          setDeleting(null)
        }}
      />
    </div>
  )
}
