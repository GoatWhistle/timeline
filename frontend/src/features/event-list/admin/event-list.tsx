import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EVENT_STATE_KEY, EVENT_STATES } from '@/entities/event/event.labels'
import { adminEventsQuery, useCreateEvent } from '@/entities/event/event.queries'
import { EventForm } from '@/entities/event/event-form'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import type { EventState } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

const ALL = 'ALL'
const DEFAULTS = { search: '', state: ALL, archived: '' }

export function AdminEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const create = useCreateEvent()

  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebouncedValue(searchInput, 300)

  const query = useQuery(
    adminEventsQuery({
      page,
      ...(search ? { search } : {}),
      ...(filters.state !== ALL ? { state: filters.state as EventState } : {}),
      ...(filters.archived === '1' ? { include_archived: true } : {}),
    }),
  )

  return (
    <div>
      <PageHeader
        title={t('list.adminTitle')}
        description={t('list.adminDescription')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('list.create')}
          </Button>
        }
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="w-72">
          <Input
            aria-label={t('list.searchAria')}
            placeholder={t('list.searchPlaceholder')}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setFilters({ search: event.target.value || undefined })
            }}
          />
        </div>
        <div className="w-56">
          <Select value={filters.state} onValueChange={(value) => setFilters({ state: value })}>
            <SelectTrigger aria-label={t('list.stateAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('list.allStates')}</SelectItem>
              {EVENT_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {t(EVENT_STATE_KEY[state])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={filters.archived === '1' ? 'default' : 'outline'}
          onClick={() => setFilters({ archived: filters.archived === '1' ? undefined : '1' })}
        >
          {t('list.showArchived')}
        </Button>
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && (
        <EmptyState title={t('list.emptyTitle')} description={t('list.emptyHint')} />
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.columnTitle')}</TableHead>
                <TableHead>{t('list.columnOrganizer')}</TableHead>
                <TableHead>{t('list.columnPeriod')}</TableHead>
                <TableHead>{t('list.columnState')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link to={`/admin/events/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.organizer ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(item.start_at)} — {formatDate(item.end_at)}
                  </TableCell>
                  <TableCell>
                    <EventStateBadge state={item.state} />
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
            <DialogTitle>{t('list.newTitle')}</DialogTitle>
          </DialogHeader>
          <EventForm
            submitLabel={t('list.create')}
            onSubmit={async (payload) => {
              const created = await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success(t('list.created'), { description: t('list.createdHint') })
              navigate(`/admin/events/${created.id}`)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
