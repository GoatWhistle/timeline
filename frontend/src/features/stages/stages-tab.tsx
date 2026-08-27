import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { STAGE_TYPE_COLOR, STAGE_TYPE_LABEL } from '@/entities/stage/stage.labels'
import {
  stagesQuery,
  useCreateStage,
  useDeleteStage,
  useUpdateStage,
} from '@/entities/stage/stage.queries'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
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
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { Dot } from '@/shared/ui/primitives/dot'
import { StageForm } from './stage-form'

function overlaps(stage: StageResponse, all: StageResponse[]): boolean {
  return all.some(
    (other) =>
      other.id !== stage.id &&
      Date.parse(other.start_at) < Date.parse(stage.end_at) &&
      Date.parse(stage.start_at) < Date.parse(other.end_at),
  )
}

export function StagesTab({ event }: { event: EventResponse }) {
  const query = useQuery(stagesQuery(event.id))
  const create = useCreateStage(event.id)
  const update = useUpdateStage(event.id)
  const remove = useDeleteStage(event.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StageResponse | null>(null)
  const [deleting, setDeleting] = useState<StageResponse | null>(null)

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const stages = query.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Добавить этап
        </Button>
      </div>

      {stages.length === 0 ? (
        <EmptyState title="Этапы не заданы" description="Добавьте первый этап события" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Порядок</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Период</TableHead>
              <TableHead className="w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell className="text-muted-foreground">{stage.sort_order}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dot className={STAGE_TYPE_COLOR[stage.type]} />
                    <span className="font-medium">{stage.name}</span>
                    {overlaps(stage, stages) && <Badge tone="neutral">пересечение</Badge>}
                  </div>
                </TableCell>
                <TableCell>{STAGE_TYPE_LABEL[stage.type]}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(stage.start_at)} — {formatDateTime(stage.end_at)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить этап ${stage.name}`}
                      onClick={() => setEditing(stage)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить этап ${stage.name}`}
                      onClick={() => setDeleting(stage)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый этап</DialogTitle>
          </DialogHeader>
          <StageForm
            submitLabel="Создать"
            eventRange={{ start_at: event.start_at, end_at: event.end_at }}
            onSubmit={async (payload) => {
              await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success('Этап создан')
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменение этапа</DialogTitle>
          </DialogHeader>
          {editing && (
            <StageForm
              stage={editing}
              submitLabel="Сохранить"
              eventRange={{ start_at: event.start_at, end_at: event.end_at }}
              onSubmit={async (payload) => {
                await update.mutateAsync({ id: editing.id, body: payload })
                setEditing(null)
                toast.success('Этап сохранён')
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Удалить этап?"
        description={`Этап «${deleting?.name}» будет удалён. Уведомления этапы не порождают, расписание напоминаний не изменится.`}
        confirmLabel="Удалить"
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove.mutateAsync(deleting.id).catch(() => toast.error('Не удалось удалить этап'))
          setDeleting(null)
        }}
      />
    </div>
  )
}
