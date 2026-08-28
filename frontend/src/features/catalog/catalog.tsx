import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CatalogParams } from '@/entities/catalog/catalog.queries'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import {
  type CatalogKindFilter,
  type CatalogScope,
  resolveLayout,
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
import { CatalogToolbar } from './catalog-toolbar'

const DEFAULTS = {
  search: '',
  origin: '',
  kind: '',
  format: '',
  state: '',
  layout: 'list',
  selected: '',
}

function listParam<K extends 'origin' | 'kind' | 'format' | 'state'>(
  value: string,
): CatalogParams[K] {
  return (value === '' ? undefined : value) as CatalogParams[K]
}

export function CatalogPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [joining, setJoining] = useState<CatalogEvent | null>(null)

  const search = useDebouncedValue(filters.search, 250)
  const layout = resolveLayout(filters.layout)

  const query = useQuery(
    catalogQuery({
      search: search === '' ? undefined : search,
      origin: listParam<'origin'>(filters.origin),
      kind: listParam<'kind'>(filters.kind),
      format: listParam<'format'>(filters.format),
      state: listParam<'state'>(filters.state),
      page,
    }),
  )

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

  return (
    <ThreePane>
      <ListPane>
        <CatalogToolbar
          search={filters.search}
          scope={filters.origin as CatalogScope}
          kind={filters.kind as CatalogKindFilter}
          layout={layout}
          onSearch={(value) => setFilters({ search: value })}
          onScope={(value) => setFilters({ origin: value })}
          onKind={(value) => setFilters({ kind: value })}
          onLayout={(value) => setFilters({ layout: value }, { resetPage: false })}
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
                    layout={layout}
                    selected={item.id === selected}
                    onSelect={select}
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
