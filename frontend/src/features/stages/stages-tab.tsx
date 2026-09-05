import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import {
  stagesQuery,
  useCreateStage,
  useDeleteStage,
  useUpdateStage,
} from '@/entities/stage/stage.queries'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { StageFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { StageForm } from './stage-form'
import { canMove, moveStage, sortedStages } from './stage-order'

function overlaps(stage: StageResponse, all: StageResponse[]): boolean {
  return all.some(
    (other) =>
      other.id !== stage.id &&
      Date.parse(other.start_at) < Date.parse(stage.end_at) &&
      Date.parse(stage.start_at) < Date.parse(other.end_at),
  )
}

export function StagesTab({ event }: { event: EventResponse }) {
  const { t } = useTranslation('event')
  const query = useQuery(stagesQuery(event.id))
  const create = useCreateStage(event.id)
  const update = useUpdateStage(event.id)
  const remove = useDeleteStage(event.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StageResponse | null>(null)
  const [deleting, setDeleting] = useState<StageResponse | null>(null)

  const stages = sortedStages(query.data ?? [])

  async function reorder(id: string, direction: -1 | 1) {
    const changes = moveStage(stages, id, direction)
    for (const change of changes) {
      await update.mutateAsync({ id: change.id, body: { sort_order: change.sort_order } })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t('stages.add')}
        </Button>
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={5} columns={5} density="action" />}
      >
        {stages.length === 0 ? (
          <EmptyState
            title={t('stages.emptyTitle')}
            description={t('stages.emptyHint')}
            figure={StageFigure}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t('stages.add')}
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('stages.columnOrder')}</TableHead>
                <TableHead>{t('stages.columnName')}</TableHead>
                <TableHead>{t('stages.columnType')}</TableHead>
                <TableHead>{t('stages.columnPeriod')}</TableHead>
                <TableHead className="w-40">{t('stages.columnActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage, position) => (
                <TableRow key={stage.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {position + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StageTypeMark type={stage.type} labelled={false} />
                      <span className="font-medium">{stage.name}</span>
                      {overlaps(stage, stages) && (
                        <Badge tone="neutral">{t('stages.overlap')}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{t(STAGE_TYPE_KEY[stage.type])}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(stage.start_at)} — {formatDateTime(stage.end_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('stages.moveUpAria', { name: stage.name })}
                        disabled={!canMove(stages, stage.id, -1) || update.isPending}
                        onClick={() => reorder(stage.id, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('stages.moveDownAria', { name: stage.name })}
                        disabled={!canMove(stages, stage.id, 1) || update.isPending}
                        onClick={() => reorder(stage.id, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <EditAction
                        label={t('stages.editAria', { name: stage.name })}
                        onClick={() => setEditing(stage)}
                      />
                      <DeleteAction
                        label={t('stages.deleteAria', { name: stage.name })}
                        onClick={() => setDeleting(stage)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stages.newTitle')}</DialogTitle>
          </DialogHeader>
          <StageForm
            submitLabel={t('list.create')}
            eventRange={{ start_at: event.start_at, end_at: event.end_at }}
            onSubmit={async (payload) => {
              await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success(t('stages.created'))
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stages.editTitle')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <StageForm
              stage={editing}
              submitLabel={t('common:action.save')}
              eventRange={{ start_at: event.start_at, end_at: event.end_at }}
              onSubmit={async (payload) => {
                await update.mutateAsync({ id: editing.id, body: payload })
                setEditing(null)
                toast.success(t('stages.saved'))
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('stages.confirmDeleteTitle')}
        description={t('stages.confirmDeleteHint', { name: deleting?.name })}
        confirmLabel={t('common:action.delete')}
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove.mutateAsync(deleting.id).catch(() => toast.error(t('stages.deleteFailed')))
          setDeleting(null)
        }}
      />
    </div>
  )
}
