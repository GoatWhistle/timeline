import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { auditQuery } from '@/entities/audit/audit.queries'
import { useListExport } from '@/entities/catalog/catalog.export'
import { CatalogExportButton } from '@/features/catalog/catalog-sort-control'
import type { AuditResponse } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { AuditFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'
import { ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import {
  AUDIT_DEFAULTS,
  type AuditParamsShape,
  auditFiltered,
  auditParams,
  nextAuditSort,
  resolveAuditOrder,
  resolveAuditSort,
} from './audit.params'
import { AuditDetailDialog } from './audit-detail-dialog'
import { AuditFiltersPopover } from './audit-filters-popover'
import { AuditTable } from './audit-table'

export function AdminAuditPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useUrlFilters(AUDIT_DEFAULTS)
  const [page, setPage] = usePageParam()
  const [detail, setDetail] = useState<AuditResponse | null>(null)
  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebouncedValue(searchInput, 300)
  const exportMutation = useListExport<AuditParamsShape>('/admin/audit/export')

  const sort = resolveAuditSort(filters.sort)
  const order = resolveAuditOrder(filters.order)
  const query = useQuery({
    ...auditQuery(auditParams(filters, search, page)),
    placeholderData: keepPreviousData,
  })
  const items = query.data?.items ?? []
  const filtered = auditFiltered(filters, search)

  function resetFilters() {
    setSearchInput('')
    setFilters({
      search: undefined,
      action: undefined,
      entity: undefined,
      from: undefined,
      to: undefined,
    })
  }

  return (
    <ThreePane>
      <ListPane>
        <ListToolbar
          title={t('audit.title')}
          search={{
            value: searchInput,
            label: t('audit.searchAria'),
            placeholder: t('audit.searchPlaceholder'),
            onChange: (value) => {
              setSearchInput(value)
              setFilters({ search: value || undefined })
            },
          }}
          tools={
            <>
              <AuditFiltersPopover
                values={filters}
                onChange={(patch) => setFilters(patch)}
                onReset={resetFilters}
              />
              <CatalogExportButton
                pending={exportMutation.isPending}
                onExport={() =>
                  exportMutation.mutate(auditParams(filters, search, 1), {
                    onError: () => toast.error(t('event:catalog.export.failed')),
                  })
                }
              />
            </>
          }
        />

        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          skeleton={<SkeletonTable rows={10} columns={5} density="action" />}
        >
          {items.length === 0 ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <EmptyState
                title={filtered ? t('audit.emptyFiltered') : t('audit.empty')}
                figure={AuditFigure}
                filtered={filtered}
                onReset={resetFilters}
              />
            </div>
          ) : (
            <>
              <div className="p-3 sm:p-4">
                <AuditTable
                  items={items}
                  sort={sort}
                  order={order}
                  onSort={(clicked) => setFilters(nextAuditSort(sort, order, clicked))}
                  onOpen={setDetail}
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

        <AuditDetailDialog detail={detail} onClose={() => setDetail(null)} />
      </ListPane>
    </ThreePane>
  )
}
