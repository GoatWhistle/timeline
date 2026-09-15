import type { RefObject } from 'react'
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
  layout: CatalogLayout
  sort: CatalogSort
  order: CatalogOrder
  filters: CatalogFilterValues
  columns: CatalogColumn[]
  exporting: boolean
  searchValue: string
  searchRef: RefObject<HTMLInputElement | null>
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
  layout,
  sort,
  order,
  filters,
  columns,
  exporting,
  searchValue,
  searchRef,
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
      <h1 className="mr-2 font-semibold text-screen tracking-tight">{t('catalog.title')}</h1>

      <Input
        ref={searchRef}
        aria-label={t('list.searchAria')}
        placeholder={t('list.searchPlaceholder')}
        value={searchValue}
        className="h-9 w-48 text-copy"
        onChange={(event) => onSearch(event.target.value)}
      />

      <CatalogFiltersPopover values={filters} onChange={onFilters} onReset={onResetFilters} />

      {layout === 'table' ? (
        <CatalogColumnsMenu columns={columns} onToggle={onToggleColumn} onReset={onResetColumns} />
      ) : (
        <CatalogSortControl sort={sort} order={order} onSort={onSort} onOrder={onOrder} />
      )}

      <CatalogExportButton pending={exporting} onExport={onExport} />

      <div className="ml-auto">
        <CatalogViewSwitch layout={layout} onLayout={onLayout} />
      </div>
    </div>
  )
}
