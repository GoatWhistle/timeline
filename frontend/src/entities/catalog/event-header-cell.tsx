import { ResizableHead } from '@/shared/ui/data-display/column-resize/resizable-table'
import type { AdminColumn, CatalogColumn, CatalogOrder, CatalogSort } from './catalog.views'

export const EVENT_COLUMN_SORT: Partial<Record<CatalogColumn | AdminColumn, CatalogSort>> = {
  title: 'title',
  start: 'start_at',
  end: 'end_at',
  duration: 'duration',
  prize: 'prize',
  tracks: 'tracks',
  teamMin: 'team_min',
  teamMax: 'team_max',
}

export const EVENT_CELL = 'h-row-roomy truncate px-3 py-2 text-meta text-muted-foreground'

export function EventHeaderCell({
  column,
  label,
  columnSort,
  sort,
  order,
  onSort,
}: {
  column: string
  label: string
  columnSort: CatalogSort | undefined
  sort: CatalogSort
  order: CatalogOrder
  onSort: (sort: CatalogSort) => void
}) {
  return (
    <ResizableHead
      column={column}
      label={label}
      sort={
        columnSort
          ? { active: columnSort === sort, order, onSort: () => onSort(columnSort) }
          : undefined
      }
    />
  )
}
