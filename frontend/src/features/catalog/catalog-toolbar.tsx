import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardField } from '@/entities/catalog/card-fields'
import type {
  CatalogColumn,
  CatalogLayout,
  CatalogOrder,
  CatalogSort,
} from '@/entities/catalog/catalog.views'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'
import { CardFieldsMenu, GridSortSlot } from './card-fields-menu'
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
  cardFields: CardField[]
  exporting: boolean
  searchValue: string
  searchRef: RefObject<HTMLInputElement | null>
  onSearch: (value: string) => void
  onLayout: (value: CatalogLayout) => void
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onResetSort: () => void
  onFilters: (patch: Partial<CatalogFilterValues>) => void
  onResetFilters: () => void
  onToggleColumn: (column: CatalogColumn) => void
  onResetColumns: () => void
  onToggleField: (field: CardField) => void
  onResetFields: () => void
  onExport: () => void
}

export function CatalogToolbar({
  layout,
  sort,
  order,
  filters,
  columns,
  cardFields,
  exporting,
  searchValue,
  searchRef,
  onSearch,
  onLayout,
  onSort,
  onOrder,
  onResetSort,
  onFilters,
  onResetFilters,
  onToggleColumn,
  onResetColumns,
  onToggleField,
  onResetFields,
  onExport,
}: CatalogToolbarProps) {
  const { t } = useTranslation('event')

  return (
    <ListToolbar
      title={t('catalog.title')}
      search={{
        value: searchValue,
        label: t('list.searchAria'),
        placeholder: t('list.searchPlaceholder'),
        ref: searchRef,
        onChange: onSearch,
      }}
      tools={
        <>
          <CatalogFiltersPopover values={filters} onChange={onFilters} onReset={onResetFilters} />
          {layout === 'table' ? (
            <CatalogColumnsMenu
              columns={columns}
              onToggle={onToggleColumn}
              onReset={onResetColumns}
            />
          ) : (
            <CardFieldsMenu fields={cardFields} onToggle={onToggleField} onReset={onResetFields} />
          )}
          <GridSortSlot show={layout === 'grid'}>
            <CatalogSortControl
              sort={sort}
              order={order}
              onSort={onSort}
              onOrder={onOrder}
              onReset={onResetSort}
            />
          </GridSortSlot>
          <CatalogExportButton pending={exporting} onExport={onExport} />
        </>
      }
      end={<CatalogViewSwitch layout={layout} onLayout={onLayout} />}
    />
  )
}
