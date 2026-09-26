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
  DEFAULT_ADMIN_COLUMNS,
} from '@/entities/catalog/catalog.views'
import { CatalogColumnsMenu } from '@/features/catalog/catalog-columns-menu'
import {
  ADMIN_FILTER_FIELDS,
  type CatalogFilterValues,
} from '@/features/catalog/catalog-filter-conditions'
import { CatalogFiltersPopover } from '@/features/catalog/catalog-filters-popover'
import { CatalogSortControl } from '@/features/catalog/catalog-sort-control'
import { CatalogViewSwitch } from '@/features/catalog/catalog-view-switch'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'
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
    <ListToolbar
      title={t('list.adminTitle')}
      search={{
        value: searchValue,
        label: t('list.searchAria'),
        placeholder: t('list.searchPlaceholder'),
        ref: searchRef,
        onChange: onSearch,
      }}
      tools={
        <>
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
              defaults={DEFAULT_ADMIN_COLUMNS}
            />
          ) : (
            <CatalogSortControl sort={sort} order={order} onSort={onSort} onOrder={onOrder} />
          )}
        </>
      }
      end={
        <>
          <CatalogViewSwitch layout={layout} onLayout={onLayout} />
          <Button size="sm" className="h-9" onClick={onCreate}>
            <Plus className="size-4" aria-hidden="true" />
            {t('list.create')}
          </Button>
        </>
      }
    />
  )
}
