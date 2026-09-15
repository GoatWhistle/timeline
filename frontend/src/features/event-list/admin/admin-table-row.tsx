import { useTranslation } from 'react-i18next'
import type { AdminColumn } from '@/entities/catalog/catalog.views'
import { CatalogCellContent, CatalogTitleCell } from '@/entities/catalog/catalog-table-row'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { ModerationMenu } from './moderation-menu'

function AdminCellContent({ event, column }: { event: EventResponse; column: AdminColumn }) {
  const { t } = useTranslation('event')

  switch (column) {
    case 'created':
      return <>{formatDateTime(event.created_at)}</>
    case 'updated':
      return <>{formatDateTime(event.updated_at)}</>
    case 'published':
      return event.published_at ? (
        <>{formatDateTime(event.published_at)}</>
      ) : (
        <span className="text-muted-foreground">{t('catalog.column.notPublished')}</span>
      )
    case 'cover':
      return event.cover_url ? (
        <>{t(`catalog.cover.${event.cover_source ?? 'NONE'}`)}</>
      ) : (
        <NoValue />
      )
    default:
      return <CatalogCellContent event={event} column={column} />
  }
}

export function AdminTableRow({
  event,
  columns,
  cellClass,
  selected,
  onSelect,
}: {
  event: EventResponse
  columns: AdminColumn[]
  cellClass: (column: AdminColumn) => string
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <tr
      data-event-row={event.id}
      aria-selected={selected}
      onClick={() => onSelect(event.id)}
      className={cn(
        'cursor-pointer border-border/60 border-b',
        'transition-colors duration-instant ease-out',
        selected ? 'bg-accent-surface' : 'hover:bg-surface-2',
      )}
    >
      {columns.map((column) =>
        column === 'title' ? (
          <CatalogTitleCell key={column} event={event} selected={selected} onSelect={onSelect} />
        ) : (
          <td key={column} className={cellClass(column)}>
            <AdminCellContent event={event} column={column} />
          </td>
        ),
      )}
      <td className="w-px whitespace-nowrap px-2 py-2">
        <ModerationMenu event={event} />
      </td>
    </tr>
  )
}
