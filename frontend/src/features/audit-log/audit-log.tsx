import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ACTIONS,
  ENTITY_TYPE_LABEL,
  ENTITY_TYPES,
} from '@/entities/audit/audit.labels'
import { auditQuery } from '@/entities/audit/audit.queries'
import type { AuditAction, AuditResponse, EntityType } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

const ALL = 'ALL'
const DEFAULTS = { action: ALL, entity: ALL, from: '', to: '' }

function DiffBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">{title}</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        {value === undefined || value === null ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export function AdminAuditPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [detail, setDetail] = useState<AuditResponse | null>(null)

  const query = useQuery(
    auditQuery({
      page,
      ...(filters.action !== ALL ? { action: filters.action as AuditAction } : {}),
      ...(filters.entity !== ALL ? { entity_type: filters.entity as EntityType } : {}),
      ...(filters.from ? { from: new Date(filters.from).toISOString() } : {}),
      ...(filters.to ? { to: new Date(filters.to).toISOString() } : {}),
    }),
  )

  return (
    <div>
      <PageHeader
        title="Аудит"
        description="История административных изменений. Выгрузка файлом в MVP не поддерживается."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Label htmlFor="audit-action">Действие</Label>
          <Select value={filters.action} onValueChange={(value) => setFilters({ action: value })}>
            <SelectTrigger id="audit-action" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все действия</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {AUDIT_ACTION_LABEL[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Label htmlFor="audit-entity">Тип объекта</Label>
          <Select value={filters.entity} onValueChange={(value) => setFilters({ entity: value })}>
            <SelectTrigger id="audit-entity" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все типы</SelectItem>
              {ENTITY_TYPES.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {ENTITY_TYPE_LABEL[entity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label htmlFor="audit-from">С даты</Label>
          <Input
            id="audit-from"
            type="date"
            className="mt-2"
            value={filters.from}
            onChange={(event) => setFilters({ from: event.target.value || undefined })}
          />
        </div>

        <div className="w-48">
          <Label htmlFor="audit-to">По дату</Label>
          <Input
            id="audit-to"
            type="date"
            className="mt-2"
            value={filters.to}
            onChange={(event) => setFilters({ to: event.target.value || undefined })}
          />
        </div>
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && <EmptyState title="Записей нет" />}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время</TableHead>
                <TableHead>Актор</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead className="w-32">Изменения</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                  <TableCell>{item.actor_email ?? 'Система'}</TableCell>
                  <TableCell>{AUDIT_ACTION_LABEL[item.action]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ENTITY_TYPE_LABEL[item.entity_type]}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setDetail(item)}>
                      Показать
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? AUDIT_ACTION_LABEL[detail.action] : 'Запись аудита'}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Актор</dt>
                  <dd>{detail.actor_email ?? 'Система'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Идентификатор запроса</dt>
                  <dd className="font-mono text-xs">{detail.request_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Объект</dt>
                  <dd>{ENTITY_TYPE_LABEL[detail.entity_type]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Идентификатор объекта</dt>
                  <dd className="font-mono text-xs">{detail.entity_id}</dd>
                </div>
              </dl>
              <div className="flex gap-4">
                <DiffBlock title="До" value={detail.before} />
                <DiffBlock title="После" value={detail.after} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
