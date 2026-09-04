import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_COLUMN_KEY,
  type CatalogColumn,
  type CatalogOrder,
  type CatalogSort,
} from '@/entities/catalog/catalog.views'
import { CatalogTableRow } from '@/entities/catalog/catalog-table-row'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'

const COLUMN_SORT: Partial<Record<CatalogColumn, CatalogSort>> = {
  title: 'title',
  period: 'start_at',
}

const COLUMN_WIDTH: Record<CatalogColumn, string> = {
  title: 'w-full',
  kind: 'w-px whitespace-nowrap',
  format: 'w-px whitespace-nowrap',
  place: 'w-48 max-w-48',
  period: 'w-px whitespace-nowrap',
  prize: 'w-px whitespace-nowrap text-right',
  organizer: 'w-40 max-w-40',
  track: 'w-36 max-w-36',
  teamSize: 'w-px whitespace-nowrap text-right',
  origin: 'w-px whitespace-nowrap',
  state: 'w-px whitespace-nowrap',
  participation: 'w-40 max-w-40',
}

function SortIcon({ active, order }: { active: boolean; order: CatalogOrder }) {
  if (!active) {
    return <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden="true" />
  }
  const Icon = order === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3 shrink-0" aria-hidden="true" />
}

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

  function cellClass(column: CatalogColumn) {
    return cn('px-3 py-2 text-meta text-muted-foreground', COLUMN_WIDTH[column])
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-copy">
        <caption className="sr-only">{t('catalog.title')}</caption>
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
                      {t(CATALOG_COLUMN_KEY[column])}
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    t(CATALOG_COLUMN_KEY[column])
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CatalogTableRow
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
