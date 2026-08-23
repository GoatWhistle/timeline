import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { RegistrationStatusValue } from '@/shared/api/types.gen'
import { reportBatchResult } from '@/shared/lib/batch'
import { formatDateTime } from '@/shared/lib/datetime'
import {
  CHANGE_SOURCE_LABEL,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUSES,
} from '@/shared/lib/enums'
import { usePageParam } from '@/shared/lib/use-url-filters'
import { Dot } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Pagination } from '@/shared/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Textarea } from '@/shared/ui/textarea'
import { statusesQuery, useBatchSetStatus, usePreviewBatchStatus } from './api'

/** Массовая установка статусов с обязательным предварительным просмотром. */
export function StatusesTab({ hackathonId }: { hackathonId: string }) {
  const [page, setPage] = usePageParam()
  const query = useQuery(statusesQuery(hackathonId, page))
  const preview = usePreviewBatchStatus(hackathonId)
  const batchSet = useBatchSetStatus(hackathonId)

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Выбрать все"
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                  />
                </TableHead>
                <TableHead>Участник</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Цикл</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Отмечено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Выбрать ${item.user.display_name}`}
                      checked={selected.has(item.participant_id)}
                      onCheckedChange={(checked) =>
                        setSelected((previous) => {
                          const next = new Set(previous)
                          if (checked === true) next.add(item.participant_id)
                          else next.delete(item.participant_id)
                          return next
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.user.display_name}</span>
                    <span className="ml-2 text-muted-foreground">{item.user.email}</span>
                    {item.note && (
                      <p className="text-muted-foreground text-xs">Заметка: {item.note}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Dot className={REGISTRATION_STATUS_COLOR[item.status]} />
                      {REGISTRATION_STATUS_LABEL[item.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.todo_cycle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {CHANGE_SOURCE_LABEL[item.last_change_source]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.registered_at ? formatDateTime(item.registered_at) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
