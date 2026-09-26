import { useTranslation } from 'react-i18next'
import {
  ADMIN_COLUMN_KEY,
  type AdminColumn,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import type { EventResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { SortIcon } from '@/shared/ui/data-display/sort-icon'
import { AdminTableRow } from './admin-table-row'

const COLUMN_SORT: Partial<Record<AdminColumn, CatalogSort>> = {
  title: 'title',
  start: 'start_at',
  end: 'end_at',
  duration: 'duration',
  prize: 'prize',
  teamMin: 'team_min',
  teamMax: 'team_max',
}

const COLUMN_WIDTH: Record<AdminColumn, string> = {
  title: 'w-full',
  kind: 'w-px whitespace-nowrap',
  format: 'w-px whitespace-nowrap',
  place: 'w-48 max-w-48',
  start: 'w-px whitespace-nowrap',
  end: 'w-px whitespace-nowrap',
  duration: 'w-px whitespace-nowrap text-center',
  prize: 'w-px whitespace-nowrap text-right',
  organizer: 'w-40 max-w-40',
  track: 'w-36 max-w-36',
  teamMin: 'w-px whitespace-nowrap text-center',
  teamMax: 'w-px whitespace-nowrap text-center',
  origin: 'w-px whitespace-nowrap',
  state: 'w-px whitespace-nowrap',
  created: 'w-px whitespace-nowrap',
  updated: 'w-px whitespace-nowrap',
  published: 'w-px whitespace-nowrap',
  cover: 'w-px whitespace-nowrap',
}

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

  function cellClass(column: AdminColumn) {
    return cn('h-row-roomy px-3 py-2 text-meta text-muted-foreground', COLUMN_WIDTH[column])
  }

  return (
    <div className="w-full overflow-x-auto rounded-surface border">
      <table className="w-full border-collapse text-copy">
        <caption className="sr-only">{t('list.adminTitle')}</caption>
        <thead>
          <tr className="border-border border-b bg-surface-1">
            {columns.map((column) => {
              const columnSort = COLUMN_SORT[column]
              const active = columnSort !== undefined && columnSort === sort
              return (
                <th
                  key={column}
                  scope="col"
                  aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'h-row px-3 text-left align-middle font-medium text-meta text-muted-foreground',
                    'pointer-coarse:h-11',
                    COLUMN_WIDTH[column],
                  )}
                >
                  {columnSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(columnSort)}
                      className={cn(
                        'inline-flex items-center gap-1',
                        TOUCH_REACH,
                        'transition-colors duration-instant ease-out',
                        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                        active ? 'text-foreground' : 'hover:text-foreground',
                      )}
                    >
                      {t(ADMIN_COLUMN_KEY[column])}
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    t(ADMIN_COLUMN_KEY[column])
                  )}
                </th>
              )
            })}
            <th scope="col" className="w-px whitespace-nowrap px-2">
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
              cellClass={cellClass}
              selected={item.id === selected}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
