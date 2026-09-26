import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_SORTS,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { SortArrow } from '@/shared/ui/data-display/sort-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'
import { Button } from '@/shared/ui/primitives/button'
import type { CatalogFilterValues } from './catalog-filter-conditions'
import { CatalogFilterSheetTrigger } from './catalog-filter-sheet'

export function CatalogToolbarPhone({
  sort,
  order,
  filters,
  onSort,
  onOrder,
  onOpenFilters,
  filterTriggerRef,
}: {
  sort: CatalogSort
  order: CatalogOrder
  filters: CatalogFilterValues
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onOpenFilters: () => void
  filterTriggerRef?: React.Ref<HTMLButtonElement>
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex items-center gap-2 border-border border-b px-4 py-2">
      <CatalogFilterSheetTrigger values={filters} onClick={onOpenFilters} ref={filterTriggerRef} />

      <Select value={sort} onValueChange={(value) => onSort(value as CatalogSort)}>
        <SelectTrigger
          aria-label={t('catalog.sortAria')}
          className={cn('ml-auto w-auto min-w-0 gap-1', TAP_TARGET)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATALOG_SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`catalog.sort.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        aria-label={t(`catalog.order.${order}`)}
        onClick={() => onOrder(order === 'asc' ? 'desc' : 'asc')}
        className={cn('shrink-0 p-0', TAP_TARGET)}
      >
        <SortArrow order={order} className="size-4" />
      </Button>
    </div>
  )
}
