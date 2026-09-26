import { useTranslation } from 'react-i18next'
import {
  CATALOG_COLUMN_KEY,
  CATALOG_LOCKED_COLUMN,
  type CatalogColumn,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import { CATALOG_WIDTHS_STORAGE_KEY, EVENT_COLUMN_WIDTH } from '@/entities/catalog/catalog.widths'
import { CatalogTableRow } from '@/entities/catalog/catalog-table-row'
import {
  EVENT_CELL,
  EVENT_COLUMN_SORT,
  EventHeaderCell,
} from '@/entities/catalog/event-header-cell'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { ResizableTable } from '@/shared/ui/data-display/column-resize/resizable-table'

export function CatalogTable({
  items,
  columns,
  selected,
  sort,
  order,
  onSelect,
  onSort,
}: {
  items: CatalogEvent[]
  columns: CatalogColumn[]
  selected: string | null
  sort: CatalogSort
  order: CatalogOrder
  onSelect: (id: string) => void
  onSort: (sort: CatalogSort) => void
}) {
  const { t } = useTranslation('event')

  return (
    <ResizableTable
      storageKey={CATALOG_WIDTHS_STORAGE_KEY}
      columns={columns.map((column) => ({ id: column, width: EVENT_COLUMN_WIDTH[column] }))}
      flexible={CATALOG_LOCKED_COLUMN}
    >
      <caption className="sr-only">{t('catalog.title')}</caption>
      <thead>
        <tr className="border-border border-b bg-surface-1">
          {columns.map((column) => (
            <EventHeaderCell
              key={column}
              column={column}
              label={t(CATALOG_COLUMN_KEY[column])}
              columnSort={EVENT_COLUMN_SORT[column]}
              sort={sort}
              order={order}
              onSort={onSort}
            />
          ))}
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {items.map((item) => (
          <CatalogTableRow
            key={item.id}
            event={item}
            columns={columns}
            cellClass={() => EVENT_CELL}
            selected={item.id === selected}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </ResizableTable>
  )
}
