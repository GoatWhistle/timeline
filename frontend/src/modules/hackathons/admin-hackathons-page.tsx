import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { HackathonState } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/lib/datetime'
import { HACKATHON_STATE_LABEL, HACKATHON_STATES } from '@/shared/lib/enums'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { usePageParam, useUrlFilters } from '@/shared/lib/use-url-filters'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'
import { Pagination } from '@/shared/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { adminHackathonsQuery, useCreateHackathon } from './api'
import { HackathonForm } from './hackathon-form'
import { HackathonStateBadge } from './state-badge'

const ALL = 'ALL'
const DEFAULTS = { search: '', state: ALL, archived: '' }

export function AdminHackathonsPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const create = useCreateHackathon()

  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebouncedValue(searchInput, 300)

  const query = useQuery(
    adminHackathonsQuery({
      page,
      ...(search ? { search } : {}),
      ...(filters.state !== ALL ? { state: filters.state as HackathonState } : {}),
      ...(filters.archived === '1' ? { include_archived: true } : {}),
    }),
  )

  return (
    <div>
      <PageHeader
        title="Хакатоны"
        description="Создание, публикация и архивирование"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Создать
          </Button>
        }
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="w-72">
          <Input
            aria-label="Поиск по названию или организатору"
            placeholder="Поиск"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setFilters({ search: event.target.value || undefined })
            }}
          />
        </div>
        <div className="w-56">
          <Select value={filters.state} onValueChange={(value) => setFilters({ state: value })}>
            <SelectTrigger aria-label="Состояние">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все состояния</SelectItem>
              {HACKATHON_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {HACKATHON_STATE_LABEL[state]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={filters.archived === '1' ? 'default' : 'outline'}
          onClick={() => setFilters({ archived: filters.archived === '1' ? undefined : '1' })}
        >
          Показывать архивные
        </Button>
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && (
        <EmptyState title="Хакатоны не найдены" description="Измените фильтры или создайте новый" />
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Организатор</TableHead>
                <TableHead>Период</TableHead>
                <TableHead>Состояние</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to={`/admin/hackathons/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.organizer ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(item.start_at)} — {formatDate(item.end_at)}
                  </TableCell>
                  <TableCell>
                    <HackathonStateBadge state={item.state} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый хакатон</DialogTitle>
          </DialogHeader>
          <HackathonForm
            submitLabel="Создать"
            onSubmit={async (payload) => {
              const created = await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success('Хакатон создан', { description: 'Он ещё не опубликован' })
              navigate(`/admin/hackathons/${created.id}`)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
