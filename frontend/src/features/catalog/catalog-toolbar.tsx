import { useTranslation } from 'react-i18next'
import type {
  CatalogColumn,
  CatalogLayout,
  CatalogOrder,
  CatalogSort,
} from '@/entities/catalog/catalog.views'
import { Input } from '@/shared/ui/forms/input'
import { CatalogColumnsMenu } from './catalog-columns-menu'
import type { CatalogFilterValues } from './catalog-filter-conditions'
import { CatalogFiltersPopover } from './catalog-filters-popover'
import { CatalogExportButton, CatalogSortControl } from './catalog-sort-control'
import { CatalogViewSwitch } from './catalog-view-switch'

export type CatalogToolbarProps = {
  search: string
  layout: CatalogLayout
  sort: CatalogSort
  order: CatalogOrder
  filters: CatalogFilterValues
  columns: CatalogColumn[]
  total: number | undefined
  exporting: boolean
  onSearch: (value: string) => void
  onLayout: (value: CatalogLayout) => void
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onFilters: (patch: Partial<CatalogFilterValues>) => void
  onResetFilters: () => void
  onToggleColumn: (column: CatalogColumn) => void
  onResetColumns: () => void
  onExport: () => void
}

export function CatalogToolbar({
  search,
  layout,
  sort,
  order,
  filters,
  columns,
  total,
  exporting,
  onSearch,
  onLayout,
  onSort,
  onOrder,
  onFilters,
  onResetFilters,
  onToggleColumn,
  onResetColumns,
  onExport,
}: CatalogToolbarProps) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3">
      <h1 className="mr-1 font-semibold text-screen tracking-tight">{t('catalog.title')}</h1>

      <Input
        value={search}
        aria-label={t('list.searchAria')}
        placeholder={t('list.searchPlaceholder')}
        onChange={(e) => onSearch(e.target.value)}
        className="h-9 w-56"
      />

      <CatalogFiltersPopover values={filters} onChange={onFilters} onReset={onResetFilters} />

      <CatalogSortControl sort={sort} order={order} onSort={onSort} onOrder={onOrder} />

      {layout === 'table' && (
        <CatalogColumnsMenu columns={columns} onToggle={onToggleColumn} onReset={onResetColumns} />
      )}

      <CatalogExportButton pending={exporting} onExport={onExport} />

      {total !== undefined && (
        <span aria-live="polite" className="text-meta text-muted-foreground tabular-nums">
          {t('catalog.resultCount', { count: total })}
        </span>
      )}

      <div className="ml-auto">
        <CatalogViewSwitch layout={layout} onLayout={onLayout} />
      </div>
    </div>
  )
}
