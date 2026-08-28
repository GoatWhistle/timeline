import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EVENT_STATE_KEY, EVENT_STATES } from '@/entities/event/event.labels'
import { adminEventsQuery, useCreateEvent } from '@/entities/event/event.queries'
import { EventForm } from '@/entities/event/event-form'
import { EventRow } from '@/entities/event/event-row/event-row'
import { AdminDetailPane } from '@/features/event-detail-pane/admin-detail-pane'
import type { EventState } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { DetailPane, ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { useSearchShortcut } from '../use-search-shortcut'

const ALL = 'ALL'
const DEFAULTS = { search: '', state: ALL, archived: '', selected: '' }

export function AdminEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const create = useCreateEvent()
  const searchRef = useRef<HTMLInputElement>(null)

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

  const items = query.data?.items ?? []
  const selected = filters.selected || null

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'admin-event-list',
  })
  useSearchShortcut(searchRef)

  return (
    <ThreePane>
      <ListPane>
        <header className="flex items-center gap-3 border-border border-b px-4 py-3">
          <h1 className="font-semibold text-screen tracking-tight">{t('list.adminTitle')}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Input
              ref={searchRef}
              aria-label={t('list.searchAria')}
              placeholder={t('list.searchPlaceholder')}
              value={searchInput}
              className="h-8 w-56 text-copy"
              onChange={(event) => {
                setSearchInput(event.target.value)
                setFilters({ search: event.target.value || undefined })
              }}
            />
            <Select value={filters.state} onValueChange={(value) => setFilters({ state: value })}>
              <SelectTrigger aria-label={t('list.stateAria')} className="h-8 w-44 text-copy">
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('list.create')}
            </Button>
          </div>
        </header>

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
            <div className="p-4">
              <EmptyState title={t('list.emptyTitle')} description={t('list.emptyHint')} />
            </div>
          ) : (
            <>
              <div role="listbox" aria-label={t('list.adminTitle')} className="flex flex-col">
                {items.map((item) => (
                  <EventRow
                    key={item.id}
                    event={item}
                    selected={item.id === selected}
                    onSelect={(id) =>
                      setFilters(
                        { selected: id === selected ? undefined : id },
                        { resetPage: false },
                      )
                    }
                  />
                ))}
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

      <DetailPane
        open={selected !== null}
        onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
        labelledBy="event-detail-title"
      >
        {selected && (
          <AdminDetailPane
            id={selected}
            onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
          />
        )}
      </DetailPane>

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
    </ThreePane>
  )
}
