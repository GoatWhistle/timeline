import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUSES,
} from '@/entities/registration/registration.labels'
import {
  statusesQuery,
  useBatchSetStatus,
  usePreviewBatchStatus,
} from '@/entities/registration/registration.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import type { RegistrationStatusValue } from '@/shared/api/types.gen'
import { usePageParam } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { Field } from '@/shared/ui/forms/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Pagination } from '@/shared/ui/navigation/pagination'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { StatusesTable } from './statuses-table/statuses-table'

export function StatusesTab({ eventId }: { eventId: string }) {
  const [page, setPage] = usePageParam()
  const query = useQuery(statusesQuery(eventId, page))
  const preview = usePreviewBatchStatus(eventId)
  const batchSet = useBatchSetStatus(eventId)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<RegistrationStatusValue>('TODO')
  const [note, setNote] = useState('')
  const [previewResult, setPreviewResult] = useState<{ affected: number; skipped: number } | null>(
    null,
  )

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const items = query.data.items
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.participant_id))

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((item) => item.participant_id)) : new Set())
  }

  async function openDialog() {
    setPreviewResult(null)
    setOpen(true)
  }

  async function runPreview(next: RegistrationStatusValue) {
    setTarget(next)
    try {
      const result = await preview.mutateAsync({
        participant_ids: [...selected],
        status: next,
      })
      setPreviewResult({ affected: result.affected, skipped: result.skipped })
    } catch {
      toast.error('Не удалось рассчитать предпросмотр')
    }
  }

  async function apply() {
    try {
      const result = await batchSet.mutateAsync({
        participant_ids: [...selected],
        status: target,
        ...(note ? { note } : {}),
      })
      reportBatchResult(result, 'Статусы обновлены')
      setSelected(new Set())
      setNote('')
      setOpen(false)
    } catch {
      toast.error('Не удалось изменить статусы')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <p className="text-sm">Выбрано записей: {selected.size}</p>
          <Button size="sm" onClick={openDialog}>
            Изменить статус
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Статусов нет"
          description="Статусы появляются после создания активной регистрации и назначения участников"
        />
      ) : (
        <>
          <StatusesTable
            items={items}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onToggleOne={(participantId, checked) =>
              setSelected((previous) => {
                const next = new Set(previous)
                if (checked) next.add(participantId)
                else next.delete(participantId)
                return next
              })
            }
          />

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Массовое изменение статуса</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Новый статус" htmlFor="batch-status">
              <Select
                value={target}
                onValueChange={(value) => runPreview(value as RegistrationStatusValue)}
              >
                <SelectTrigger id="batch-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {REGISTRATION_STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Заметка администратора" htmlFor="batch-note">
              <Textarea
                id="batch-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            <div className="rounded-md border border-dashed p-3 text-sm">
              {previewResult ? (
                <>
                  Будет изменено записей: <strong>{previewResult.affected}</strong>, пропущено:{' '}
                  <strong>{previewResult.skipped}</strong>.
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={preview.isPending}
                  onClick={() => runPreview(target)}
                >
                  Рассчитать предпросмотр
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={apply} disabled={!previewResult || batchSet.isPending}>
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
