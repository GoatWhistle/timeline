import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCatalogExport } from '@/entities/catalog/catalog.export'
import type { CatalogParams } from '@/entities/catalog/catalog.queries'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import {
  type CatalogFormatFilter,
  type CatalogKindFilter,
  type CatalogOrder,
  type CatalogScope,
  type CatalogSort,
  type CatalogStateFilter,
  resolveLayout,
  resolveOrder,
  resolveSort,
} from '@/entities/catalog/catalog.views'
import { CatalogCard } from '@/entities/catalog/catalog-card'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { cn } from '@/shared/styling/class-names/class-names'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { DetailPane, ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { CatalogDetail } from './catalog-detail'
import { CatalogTable } from './catalog-table'
import { CatalogToolbar } from './catalog-toolbar'

const DEFAULTS = {
  search: '',
  origin: '',
  kind: '',
  format: '',
  state: '',
  layout: 'list',
  selected: '',
  sort: '',
  order: '',
  from: '',
  to: '',
}

function listParam<K extends 'origin' | 'kind' | 'format' | 'state'>(
  value: string,
): CatalogParams[K] {
  return (value === '' ? undefined : value) as CatalogParams[K]
}

function startOfDay(value: string): string | undefined {
  if (value === '') return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

function endOfDay(value: string): string | undefined {
  if (value === '') return undefined
  const parsed = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export function CatalogPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [joining, setJoining] = useState<CatalogEvent | null>(null)
  const exportMutation = useCatalogExport()

  const search = useDebouncedValue(filters.search, 250)
  const layout = resolveLayout(filters.layout)
  const sort = resolveSort(filters.sort)
  const order = resolveOrder(filters.order)

  const params: CatalogParams = {
    search: search === '' ? undefined : search,
    origin: listParam<'origin'>(filters.origin),
    kind: listParam<'kind'>(filters.kind),
    format: listParam<'format'>(filters.format),
    state: listParam<'state'>(filters.state),
    from: startOfDay(filters.from),
    to: endOfDay(filters.to),
    sort,
    order,
  }

  const query = useQuery(catalogQuery({ ...params, page }))

  const items = query.data?.items ?? []
  const selected = filters.selected || null
  const selectedEvent = items.find((item) => item.id === selected) ?? null

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'catalog-list',
  })

  function select(id: string) {
    setFilters({ selected: id === selected ? undefined : id }, { resetPage: false })
  }

  function changeSort(next: CatalogSort) {
    if (next === sort) {
      setFilters({ order: order === 'asc' ? 'desc' : 'asc' })
      return
    }
    setFilters({ sort: next, order: 'asc' })
  }

  function runExport() {
    exportMutation.mutate(params, {
      onSuccess: () => toast.success(t('catalog.export.done')),
      onError: () => toast.error(t('catalog.export.failed')),
    })
  }

  return (
    <ThreePane>
      <ListPane>
        <CatalogToolbar
          search={filters.search}
          scope={filters.origin as CatalogScope}
          kind={filters.kind as CatalogKindFilter}
          state={filters.state as CatalogStateFilter}
          format={filters.format as CatalogFormatFilter}
          layout={layout}
          sort={sort}
          order={order}
          from={filters.from}
          to={filters.to}
          total={query.data?.meta.total}
          exporting={exportMutation.isPending}
          onSearch={(value) => setFilters({ search: value })}
          onScope={(value) => setFilters({ origin: value })}
          onKind={(value) => setFilters({ kind: value })}
          onState={(value) => setFilters({ state: value })}
          onFormat={(value) => setFilters({ format: value })}
          onLayout={(value) => setFilters({ layout: value }, { resetPage: false })}
          onSort={changeSort}
          onOrder={(value: CatalogOrder) => setFilters({ order: value })}
          onFrom={(value) => setFilters({ from: value })}
          onTo={(value) => setFilters({ to: value })}
          onClearPeriod={() => setFilters({ from: undefined, to: undefined })}
          onExport={runExport}
        />

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
            <div className="p-4">
              <EmptyState title={t('catalog.empty')} description={t('catalog.emptyHint')} />
            </div>
          ) : (
            <>
              {layout === 'table' ? (
                <CatalogTable
                  items={items}
                  selected={selected}
                  sort={sort}
                  order={order}
                  onSelect={select}
                  onSort={changeSort}
                />
              ) : (
                <div
                  role="listbox"
                  aria-label={t('catalog.title')}
                  className={cn(
                    layout === 'grid'
                      ? 'grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3 p-4'
                      : 'flex flex-col',
                  )}
                >
                  {items.map((item) => (
                    <CatalogCard
                      key={item.id}
                      event={item}
                      layout={layout === 'grid' ? 'grid' : 'list'}
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

      <DetailPane
        open={selectedEvent !== null}
        onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
        labelledBy="catalog-detail-title"
      >
        {selectedEvent && (
          <CatalogDetail
            event={selectedEvent}
            joining={joining?.id === selectedEvent.id}
            onJoin={() => setJoining(selectedEvent)}
            onJoinClose={() => setJoining(null)}
            onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
          />
        )}
      </DetailPane>
    </ThreePane>
  )
}
