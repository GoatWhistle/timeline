import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAdminColumns } from '@/entities/catalog/admin.columns'
import { ADMIN_CARD_FIELDS_KEY, useCardFields } from '@/entities/catalog/card-fields'
import { useAdminEventsExport } from '@/entities/catalog/catalog.export'
import {
  type CatalogOrder,
  type CatalogSort,
  effectiveLayout,
  resolveLayout,
  resolveOrder,
  resolveSort,
} from '@/entities/catalog/catalog.views'
import { adminEventsQuery, useCreateEvent } from '@/entities/event/event.queries'
import { EventForm } from '@/entities/event/event-form'
import {
  ADMIN_FILTER_FIELDS,
  activeFilterCount,
  type CatalogFilterValues,
} from '@/features/catalog/catalog-filter-conditions'
import { AdminEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EventListFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { useSearchShortcut } from '../use-search-shortcut'
import { ADMIN_DEFAULTS, adminListParams } from './admin.params'
import { AdminCards } from './admin-cards'
import { AdminTable } from './admin-table'
import { AdminToolbar } from './admin-toolbar'

export function AdminEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(ADMIN_DEFAULTS)
  const [page, setPage] = usePageParam()
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const create = useCreateEvent()
  const searchRef = useRef<HTMLInputElement>(null)
  const { columns, toggle: toggleColumn, reset: resetColumns } = useAdminColumns()
  const cardFields = useCardFields(ADMIN_CARD_FIELDS_KEY)
  const exportMutation = useAdminEventsExport()
  const phone = usePhoneViewport()

  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebouncedValue(searchInput, 300)

  const layout = effectiveLayout(resolveLayout(filters.layout), phone)
  const sort = resolveSort(filters.sort)
  const order = resolveOrder(filters.order)

  const conditions = Object.fromEntries(
    ADMIN_FILTER_FIELDS.map((field) => [field, filters[field]]),
  ) as CatalogFilterValues

  const query = useQuery({
    ...adminEventsQuery(adminListParams(filters, search, sort, order, page)),
    placeholderData: keepPreviousData,
  })

  const items = query.data?.items ?? []
  const filtered = search !== '' || activeFilterCount(conditions, ADMIN_FILTER_FIELDS) > 0
  const selected = filters.selected || null
  const { openEventCard } = useEventOverlay()

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'admin-event-list',
  })
  useSearchShortcut(searchRef)

  function select(id: string) {
    setFilters({ selected: id }, { resetPage: false })
    openEventCard(id)
  }

  function changeSort(next: CatalogSort) {
    if (next === sort) {
      setFilters({ order: order === 'asc' ? 'desc' : 'asc' })
      return
    }
    setFilters({ sort: next, order: 'asc' })
  }

  function resetFilters() {
    setSearchInput('')
    setFilters({
      search: undefined,
      ...Object.fromEntries(ADMIN_FILTER_FIELDS.map((field) => [field, undefined])),
    })
  }

  return (
    <ThreePane>
      <ListPane>
        <AdminToolbar
          layout={layout}
          sort={sort}
          order={order}
          filters={conditions}
          columns={columns}
          cardFields={cardFields.fields}
          exporting={exportMutation.isPending}
          searchValue={searchInput}
          searchRef={searchRef}
          onSearch={(value) => {
            setSearchInput(value)
            setFilters({ search: value || undefined })
          }}
          onLayout={(value) => setFilters({ layout: value }, { resetPage: false })}
          onSort={changeSort}
          onOrder={(value: CatalogOrder) => setFilters({ order: value })}
          onResetSort={() => setFilters({ sort: '', order: '' })}
          onFilters={(patch) => setFilters(patch)}
          onResetFilters={resetFilters}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
          onToggleField={cardFields.toggle}
          onResetFields={cardFields.reset}
          onExport={() =>
            exportMutation.mutate(adminListParams(filters, search, sort, order, 1), {
              onError: () => toast.error(t('catalog.export.failed')),
            })
          }
          onCreate={() => setCreateOpen(true)}
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
                title={filtered ? t('list.emptyFiltered') : t('list.emptyTitle')}
                description={filtered ? undefined : t('list.emptyHint')}
                figure={EventListFigure}
                filtered={filtered}
                onReset={resetFilters}
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    {t('list.create')}
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="p-3 sm:p-4">
                {layout === 'table' ? (
                  <AdminTable
                    items={items}
                    columns={columns}
                    selected={selected}
                    sort={sort}
                    order={order}
                    onSelect={select}
                    onSort={changeSort}
                  />
                ) : (
                  <AdminCards
                    items={items}
                    selected={selected}
                    onSelect={select}
                    fields={cardFields.fields}
                  />
                )}
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

      <AdminEventOverlay />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl">
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
