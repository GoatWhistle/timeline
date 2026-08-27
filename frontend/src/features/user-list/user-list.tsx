import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useActivateUser, useDeactivateUser, useDeleteUser } from '@/entities/user/user.queries'
import { usersQuery } from '@/shared/api/directory'
import type { UserSummary } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
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

const DEFAULTS = { query: '' }

export function AdminUsersPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [searchInput, setSearchInput] = useState(filters.query)
  const search = useDebouncedValue(searchInput, 300)

  const [deleting, setDeleting] = useState<UserSummary | null>(null)

  const query = useQuery(usersQuery({ page, ...(search ? { query: search } : {}) }))
  const activate = useActivateUser()
  const deactivate = useDeactivateUser()
  const remove = useDeleteUser()

  return (
    <div>
      <PageHeader title="Пользователи" description="Поиск по имени и адресу, управление доступом" />

      <div className="mb-4 w-80">
        <Input
          aria-label="Поиск по имени или email"
          placeholder="Поиск"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setFilters({ query: event.target.value || undefined })
          }}
        />
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && (
        <EmptyState title="Пользователи не найдены" />
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Состояние</TableHead>
                <TableHead className="w-72">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.email}</TableCell>
                  <TableCell>
                    {item.is_active ? (
                      <Badge tone="primary">активен</Badge>
                    ) : (
                      <Badge tone="danger">деактивирован</Badge>
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
                              .then(() => toast.success('Учётная запись деактивирована'))
                              .catch(() => toast.error('Не удалось деактивировать'))
                          }
                        >
                          Деактивировать
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activate.isPending}
                          onClick={() =>
                            activate
                              .mutateAsync(item.id)
                              .then(() => toast.success('Учётная запись активирована'))
                              .catch(() => toast.error('Не удалось активировать'))
                          }
                        >
                          Активировать
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Удалить учётную запись?"
        description={
          <>
            Удаление необратимо. Учётные данные и каналы доставки удаляются, имя и email
            обезличиваются. Ссылки участия и записи аудита сохраняются.
            <br />
            <strong>{deleting?.display_name}</strong> · {deleting?.email}
          </>
        }
        confirmLabel="Удалить безвозвратно"
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove
            .mutateAsync(deleting.id)
            .then(() => toast.success('Учётная запись удалена'))
            .catch(() => toast.error('Не удалось удалить'))
          setDeleting(null)
        }}
      />
    </div>
  )
}
