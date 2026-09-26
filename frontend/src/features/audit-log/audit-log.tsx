import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AUDIT_ACTIONS,
  auditActionKey,
  ENTITY_TYPES,
  entityTypeKey,
} from '@/entities/audit/audit.labels'
import { auditQuery } from '@/entities/audit/audit.queries'
import type { AuditAction, AuditResponse, EntityType } from '@/shared/api/types.gen'
import { dayEndIso, dayStartIso } from '@/shared/datetime/civil'
import { formatDateTime } from '@/shared/datetime/datetime'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import {
  ResizableHead,
  ResizableTable,
  type TableColumn,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { AuditFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { GroupLabel } from '@/shared/ui/data-display/group-label/group-label'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { TableBody, TableCell, TableHeader, TableRow } from '@/shared/ui/data-display/table'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
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
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'

const AUDIT_COLUMNS: TableColumn[] = [
  { id: 'time', width: 170 },
  { id: 'actor', width: 220 },
  { id: 'action', width: 170 },
  { id: 'entity', width: 150 },
  { id: 'changes', width: 120 },
]

const ALL = 'ALL'
const DEFAULTS = { action: ALL, entity: ALL, from: '', to: '' }

function DiffBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <GroupLabel as="p" className="mb-1">
        {title}
      </GroupLabel>
      <pre className="overflow-x-auto rounded-control bg-muted p-3 text-caption">
        {value === undefined || value === null ? <NoValue /> : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export function AdminAuditPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [detail, setDetail] = useState<AuditResponse | null>(null)

  const filtered =
    filters.action !== ALL || filters.entity !== ALL || filters.from !== '' || filters.to !== ''

  function resetFilters() {
    setFilters({ action: undefined, entity: undefined, from: undefined, to: undefined })
  }

  const query = useQuery(
    auditQuery({
      page,
      ...(filters.action !== ALL ? { action: filters.action as AuditAction } : {}),
      ...(filters.entity !== ALL ? { entity_type: filters.entity as EntityType } : {}),
      ...(dayStartIso(filters.from ?? '') ? { from: dayStartIso(filters.from ?? '') } : {}),
      ...(dayEndIso(filters.to ?? '') ? { to: dayEndIso(filters.to ?? '') } : {}),
    }),
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Label htmlFor="audit-action">{t('audit.action')}</Label>
          <Select value={filters.action} onValueChange={(value) => setFilters({ action: value })}>
            <SelectTrigger id="audit-action" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('audit.allActions')}</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {t(auditActionKey(action))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Label htmlFor="audit-entity">{t('audit.entity')}</Label>
          <Select value={filters.entity} onValueChange={(value) => setFilters({ entity: value })}>
            <SelectTrigger id="audit-entity" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('audit.allEntities')}</SelectItem>
              {ENTITY_TYPES.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {t(entityTypeKey(entity))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label htmlFor="audit-from">{t('audit.from')}</Label>
          <div className="mt-2">
            <DatePicker
              id="audit-from"
              value={filters.from ?? ''}
              onChange={(date) => setFilters({ from: date || undefined })}
            />
          </div>
        </div>

        <div className="w-48">
          <Label htmlFor="audit-to">{t('audit.to')}</Label>
          <div className="mt-2">
            <DatePicker
              id="audit-to"
              value={filters.to ?? ''}
              onChange={(date) => setFilters({ to: date || undefined })}
            />
          </div>
        </div>
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={10} columns={5} density="action" />}
      >
        {query.data?.items.length === 0 ? (
          <EmptyState
            title={filtered ? t('audit.emptyFiltered') : t('audit.empty')}
            figure={AuditFigure}
            filtered={filtered}
            onReset={resetFilters}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ResizableTable
              storageKey="timeline-audit-widths"
              columns={AUDIT_COLUMNS}
              flexible="actor"
            >
              <TableHeader>
                <TableRow>
                  <ResizableHead column="time" label={t('audit.columnTime')} />
                  <ResizableHead column="actor" label={t('audit.columnActor')} />
                  <ResizableHead column="action" label={t('audit.columnAction')} />
                  <ResizableHead column="entity" label={t('audit.columnEntity')} />
                  <ResizableHead column="changes" label={t('audit.columnChanges')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="truncate text-muted-foreground">
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
                      <Button variant="ghost" size="sm" onClick={() => setDetail(item)}>
                        {t('audit.show')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>

            {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
          </div>
        )}
      </QueryBoundary>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? t(auditActionKey(detail.action)) : t('audit.record')}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-copy">
                <div>
                  <dt className="text-muted-foreground">{t('audit.columnActor')}</dt>
                  <dd>{detail.actor_email ?? t('audit.system')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('audit.requestId')}</dt>
                  <dd className="font-mono text-caption">{detail.request_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('audit.columnEntity')}</dt>
                  <dd>{t(entityTypeKey(detail.entity_type))}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('audit.entityId')}</dt>
                  <dd className="font-mono text-caption">{detail.entity_id}</dd>
                </div>
              </dl>
              <div className="flex gap-4">
                <DiffBlock title={t('audit.before')} value={detail.before} />
                <DiffBlock title={t('audit.after')} value={detail.after} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
