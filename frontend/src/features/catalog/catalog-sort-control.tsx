import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_SORTS,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import { SortArrow } from '@/shared/ui/data-display/sort-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

export function CatalogSortControl({
  sort,
  order,
  onSort,
  onOrder,
}: {
  sort: CatalogSort
  order: CatalogOrder
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex items-center gap-1">
      <Select value={sort} onValueChange={(value) => onSort(value as CatalogSort)}>
        <SelectTrigger aria-label={t('catalog.sortAria')} className="h-9 w-auto min-w-36 gap-1">
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
        size="sm"
        aria-label={t(`catalog.order.${order}`)}
        title={t('catalog.orderAria')}
        onClick={() => onOrder(order === 'asc' ? 'desc' : 'asc')}
        className="size-9 shrink-0 p-0"
      >
        <SortArrow order={order} className="size-4" />
      </Button>
    </div>
  )
}

export function CatalogExportButton({
  pending,
  onExport,
}: {
  pending: boolean
  onExport: () => void
}) {
  const { t } = useTranslation('event')

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={onExport}
      title={t('catalog.export.hint')}
      className="h-9 gap-1.5"
    >
      <Download className="size-4" aria-hidden="true" />
      {pending ? t('catalog.export.pending') : t('catalog.export.action')}
    </Button>
  )
}
