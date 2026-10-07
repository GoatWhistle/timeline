import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCatalogColumns } from '@/entities/catalog/catalog.columns'
import { useCatalogExport } from '@/entities/catalog/catalog.export'
import type { CatalogParams } from '@/entities/catalog/catalog.queries'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import {
  type CatalogOrder,
  type CatalogSort,
  effectiveLayout,
  resolveLayout,
  resolveOrder,
  resolveSort,
} from '@/entities/catalog/catalog.views'
import { CARD_GRID, CatalogCard } from '@/entities/catalog/catalog-card'
import { CatalogEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { cn } from '@/shared/styling/class-names/class-names'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { useSearchShortcut } from '../event-list/use-search-shortcut'
import {
  CATALOG_DEFAULTS,
  CATALOG_FILTER_FIELDS_URL,
  endOfDay,
  joinedParam,
  listParam,
  startOfDay,
} from './catalog.params'
import { CatalogEmpty } from './catalog-empty'
import { activeFilterCount, type CatalogFilterValues } from './catalog-filter-conditions'
import { CatalogFilterSheet } from './catalog-filter-sheet'
import { CatalogTable } from './catalog-table'
import { CatalogToolbar } from './catalog-toolbar'
import { CatalogToolbarPhone } from './catalog-toolbar-phone'

export function CatalogPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(CATALOG_DEFAULTS)
  const [page, setPage] = usePageParam()
  const [filterSheet, setFilterSheet] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const exportMutation = useCatalogExport()
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebouncedValue(searchInput, 300)
  const { columns, toggle: toggleColumn, reset: resetColumns } = useCatalogColumns()
  const phone = usePhoneViewport()

  const layout = effectiveLayout(resolveLayout(filters.layout), phone)
  const sort = resolveSort(filters.sort)
  const order = resolveOrder(filters.order)

  const conditions = Object.fromEntries(
    CATALOG_FILTER_FIELDS_URL.map((field) => [field, filters[field]]),
  ) as CatalogFilterValues

  const params: CatalogParams = {
    ...(search ? { search } : {}),
    origin: listParam<'origin'>(filters.origin),
    kind: listParam<'kind'>(filters.kind),
    format: listParam<'format'>(filters.format),
    state: listParam<'state'>(filters.state),
    from: startOfDay(filters.from),
    to: endOfDay(filters.to),
    joined: joinedParam(filters.joined),
    sort,
    order,
  }

  const query = useQuery({
    ...catalogQuery({ ...params, page }),
    placeholderData: keepPreviousData,
  })

  const items = query.data?.items ?? []
  const filtered = search !== '' || activeFilterCount(conditions) > 0
  const selected = filters.selected || null
  const { openEventCard } = useEventOverlay()

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'catalog-list',
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
      ...Object.fromEntries(CATALOG_FILTER_FIELDS_URL.map((field) => [field, undefined])),
    })
  }

  function runExport() {
    exportMutation.mutate(params, {
      onError: () => toast.error(t('catalog.export.failed')),
    })
  }

  return (
    <ThreePane>
      <ListPane>
        {phone ? (
          <CatalogToolbarPhone
            sort={sort}
            order={order}
            filters={conditions}
            onSort={changeSort}
            onOrder={(value: CatalogOrder) => setFilters({ order: value })}
            onOpenFilters={() => setFilterSheet(true)}
            filterTriggerRef={filterTriggerRef}
          />
        ) : (
          <CatalogToolbar
            layout={layout}
            sort={sort}
            order={order}
            filters={conditions}
            columns={columns}
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
            onExport={runExport}
          />
        )}

        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          skeleton={<SkeletonRows rows={8} />}
        >
          {items.length === 0 ? (
            <CatalogEmpty filtered={filtered} onResetFilters={resetFilters} />
          ) : (
            <>
              {layout === 'table' ? (
                <div className="p-3 sm:p-4">
                  <CatalogTable
                    items={items}
                    columns={columns}
                    selected={selected}
                    sort={sort}
                    order={order}
                    onSelect={select}
                    onSort={changeSort}
                  />
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-label={t('catalog.title')}
                  className={cn(CARD_GRID, 'p-3 pb-0 sm:p-4 sm:pb-0')}
                >
                  {items.map((item) => (
                    <CatalogCard
                      key={item.id}
                      event={item}
                      selected={item.id === selected}
                      onSelect={select}
                    />
                  ))}
                </div>
              )}
              {query.data && (
                <div className="p-4">
                  <Pagination meta={query.data.meta} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </QueryBoundary>
      </ListPane>

      <CatalogEventOverlay items={items} />

      {phone && (
        <CatalogFilterSheet
          values={conditions}
          onChange={(patch) => setFilters(patch)}
          onReset={resetFilters}
          open={filterSheet}
          onOpenChange={setFilterSheet}
          returnFocusTo={filterTriggerRef}
        />
      )}
    </ThreePane>
  )
}
