import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CatalogOrder, CatalogSort } from '@/entities/catalog/catalog.views'
import { CatalogTableRow } from '@/entities/catalog/catalog-table-row'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

type Column = {
  key: string
  labelKey: string
  sort?: CatalogSort
  className?: string
  align?: 'right'
}

const COLUMNS: Column[] = [
  { key: 'title', labelKey: 'catalog.column.title', sort: 'title', className: 'w-full' },
  {
    key: 'format',
    labelKey: 'catalog.column.format',
    className: 'hidden w-px whitespace-nowrap lg:table-cell',
  },
  {
    key: 'place',
    labelKey: 'catalog.column.place',
    className: 'hidden w-48 xl:table-cell',
  },
  {
    key: 'period',
    labelKey: 'catalog.column.period',
    sort: 'start_at',
    className: 'w-px whitespace-nowrap',
  },
  {
    key: 'prize',
    labelKey: 'catalog.column.prize',
    className: 'hidden w-px whitespace-nowrap md:table-cell',
    align: 'right',
  },
  { key: 'state', labelKey: 'catalog.column.state', className: 'w-px whitespace-nowrap' },
]

function SortIcon({ active, order }: { active: boolean; order: CatalogOrder }) {
  if (!active) {
    return <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden="true" />
  }
  const Icon = order === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3 shrink-0" aria-hidden="true" />
}

export function CatalogTable({
  items,
  selected,
  sort,
  order,
  onSelect,
  onSort,
}: {
  items: CatalogEvent[]
  selected: string | null
  sort: CatalogSort
  order: CatalogOrder
  onSelect: (id: string) => void
  onSort: (sort: CatalogSort) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-copy">
        <caption className="sr-only">{t('catalog.title')}</caption>
        <thead>
          <tr className="border-border border-b bg-surface-1">
            {COLUMNS.map((column) => {
              const active = column.sort !== undefined && column.sort === sort
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'h-row px-3 text-left align-middle font-medium text-meta text-muted-foreground',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.sort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sort as CatalogSort)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors duration-instant',
                        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                        active ? 'text-foreground' : 'hover:text-foreground',
                      )}
                    >
                      {t(column.labelKey)}
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    t(column.labelKey)
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
              selected={item.id === selected}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
