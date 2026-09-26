import { useTranslation } from 'react-i18next'
import {
  ADMIN_COLUMN_KEY,
  type AdminColumn,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import {
  ADMIN_WIDTHS_STORAGE_KEY,
  EVENT_COLUMN_WIDTH,
  MODERATE_COLUMN_WIDTH,
} from '@/entities/catalog/catalog.widths'
import {
  EVENT_CELL,
  EVENT_COLUMN_SORT,
  EventHeaderCell,
} from '@/entities/catalog/event-header-cell'
import type { EventResponse } from '@/shared/api/types.gen'
import { ResizableTable } from '@/shared/ui/data-display/column-resize/resizable-table'
import { AdminTableRow } from './admin-table-row'

export function AdminTable({
  items,
  columns,
  selected,
  sort,
  order,
  onSelect,
  onSort,
}: {
  items: EventResponse[]
  columns: AdminColumn[]
  selected: string | null
  sort: CatalogSort
  order: CatalogOrder
  onSelect: (id: string) => void
  onSort: (sort: CatalogSort) => void
}) {
  const { t } = useTranslation('event')

  return (
    <ResizableTable
      storageKey={ADMIN_WIDTHS_STORAGE_KEY}
      columns={[
        ...columns.map((column) => ({ id: column, width: EVENT_COLUMN_WIDTH[column] })),
        { id: 'moderate', width: MODERATE_COLUMN_WIDTH, fixed: true },
      ]}
      flexible="title"
    >
      <caption className="sr-only">{t('list.adminTitle')}</caption>
      <thead>
        <tr className="border-border border-b bg-surface-1">
          {columns.map((column) => (
            <EventHeaderCell
              key={column}
              column={column}
              label={t(ADMIN_COLUMN_KEY[column])}
              columnSort={EVENT_COLUMN_SORT[column]}
              sort={sort}
              order={order}
              onSort={onSort}
            />
          ))}
          <th scope="col" className="px-2">
            <span className="sr-only">{t('list.moderateHeader')}</span>
          </th>
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {items.map((item) => (
          <AdminTableRow
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
