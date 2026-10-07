import { useTranslation } from 'react-i18next'
import { auditActionKey, entityTypeKey } from '@/entities/audit/audit.labels'
import type { AuditResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  ResizableHead,
  ResizableTable,
  type TableColumn,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { TableBody, TableCell, TableHeader, TableRow } from '@/shared/ui/data-display/table'
import { Button } from '@/shared/ui/primitives/button'
import type { AuditOrder, AuditSort } from './audit.params'

const AUDIT_COLUMNS: TableColumn[] = [
  { id: 'time', width: 220 },
  { id: 'actor', width: 220 },
  { id: 'action', width: 190 },
  { id: 'entity', width: 160 },
  { id: 'changes', width: 120 },
]

const COLUMN_SORT: Record<string, AuditSort> = {
  time: 'created_at',
  actor: 'actor',
  action: 'action',
  entity: 'entity_type',
}

const HEAD_LABEL: Record<string, string> = {
  time: 'audit.columnTime',
  actor: 'audit.columnActor',
  action: 'audit.columnAction',
  entity: 'audit.columnEntity',
  changes: 'audit.columnChanges',
}

export function AuditTable({
  items,
  sort,
  order,
  onSort,
  onOpen,
}: {
  items: AuditResponse[]
  sort: AuditSort
  order: AuditOrder
  onSort: (sort: AuditSort) => void
  onOpen: (item: AuditResponse) => void
}) {
  const { t } = useTranslation()

  return (
    <ResizableTable storageKey="timeline-audit-widths" columns={AUDIT_COLUMNS} flexible="actor">
      <caption className="sr-only">{t('audit.title')}</caption>
      <TableHeader>
        <TableRow className="bg-surface-1 hover:bg-surface-1">
          {AUDIT_COLUMNS.map(({ id }) => {
            const columnSort = COLUMN_SORT[id]
            return (
              <ResizableHead
                key={id}
                column={id}
                label={t(HEAD_LABEL[id] ?? '')}
                sort={
                  columnSort
                    ? { active: columnSort === sort, order, onSort: () => onSort(columnSort) }
                    : undefined
                }
              />
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            data-audit-row={item.id}
            onClick={() => onOpen(item)}
            className={cn('cursor-pointer')}
          >
            <TableCell className="truncate text-meta text-muted-foreground tabular-nums">
              {formatDateTime(item.created_at)}
            </TableCell>
            <TableCell data-lead="" className="truncate">
              {item.actor_email ?? t('audit.system')}
            </TableCell>
            <TableCell className="truncate">{t(auditActionKey(item.action))}</TableCell>
            <TableCell className="truncate text-muted-foreground">
              {t(entityTypeKey(item.entity_type))}
            </TableCell>
            <TableCell className="truncate">
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen(item)
                }}
              >
                {t('audit.show')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResizableTable>
  )
}
