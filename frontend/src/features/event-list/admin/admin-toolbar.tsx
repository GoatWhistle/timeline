import { Plus } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ADMIN_COLUMN_KEY,
  ADMIN_COLUMNS,
  type AdminColumn,
  type CatalogLayout,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import { CatalogColumnsMenu } from '@/features/catalog/catalog-columns-menu'
import {
  ADMIN_FILTER_FIELDS,
  type CatalogFilterValues,
} from '@/features/catalog/catalog-filter-conditions'
import { CatalogFiltersPopover } from '@/features/catalog/catalog-filters-popover'
import { CatalogSortControl } from '@/features/catalog/catalog-sort-control'
import { CatalogViewSwitch } from '@/features/catalog/catalog-view-switch'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'

export function AdminToolbar({
  layout,
  sort,
  order,
  filters,
  columns,
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
  onCreate,
}: {
  layout: CatalogLayout
  sort: CatalogSort
  order: CatalogOrder
  filters: CatalogFilterValues
  columns: AdminColumn[]
  searchValue: string
  searchRef: RefObject<HTMLInputElement | null>
  onSearch: (value: string) => void
  onLayout: (value: CatalogLayout) => void
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onFilters: (patch: Partial<CatalogFilterValues>) => void
  onResetFilters: () => void
  onToggleColumn: (column: AdminColumn) => void
  onResetColumns: () => void
  onCreate: () => void
}) {
  const { t } = useTranslation('event')

  return (
    <header className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3">
      <h1 className="mr-2 font-semibold text-screen tracking-tight">{t('list.adminTitle')}</h1>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <Input
          ref={searchRef}
          aria-label={t('list.searchAria')}
          placeholder={t('list.searchPlaceholder')}
          value={searchValue}
          className="h-9 min-w-24 flex-1 text-copy sm:w-48 sm:flex-none"
          onChange={(event) => onSearch(event.target.value)}
        />

        <CatalogFiltersPopover
          values={filters}
          onChange={onFilters}
          onReset={onResetFilters}
          fields={ADMIN_FILTER_FIELDS}
          admin
        />

        {layout === 'table' ? (
          <CatalogColumnsMenu
            columns={columns}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
            all={ADMIN_COLUMNS}
            labels={ADMIN_COLUMN_KEY}
            locked="title"
          />
        ) : (
          <CatalogSortControl sort={sort} order={order} onSort={onSort} onOrder={onOrder} />
        )}

        <CatalogViewSwitch layout={layout} onLayout={onLayout} />

        <Button size="sm" className="h-9" onClick={onCreate}>
          <Plus className="size-4" aria-hidden="true" />
          {t('list.create')}
        </Button>
      </div>
    </header>
  )
}
