import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUSES,
} from '@/entities/registration/registration.labels'
import {
  statusesQuery,
  useBatchSetStatus,
  usePreviewBatchStatus,
} from '@/entities/registration/registration.queries'
import { BatchResultPanel } from '@/features/batch-result-panel/batch-result-panel'
import { NotificationPreviewDialog } from '@/features/notification-preview/preview-dialog'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import type { BatchResult, RegistrationStatusValue } from '@/shared/api/types.gen'
import { usePageParam } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
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
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { StatusesTable } from './statuses-table/statuses-table'

export function StatusesTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation('registration')
  const [page, setPage] = usePageParam()
  const query = useQuery(statusesQuery(eventId, page))
  const preview = usePreviewBatchStatus(eventId)
  const batchSet = useBatchSetStatus(eventId)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<RegistrationStatusValue>('TODO')
  const [note, setNote] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<{ affected: number; skipped: number } | null>(
    null,
  )
  const [outcome, setOutcome] = useState<BatchResult | null>(null)

  const items = query.data?.items ?? []
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.participant_id))

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((item) => item.participant_id)) : new Set())
  }

  async function openDialog() {
    setPreviewResult(null)
    setOutcome(null)
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
      toast.error(t('statuses.previewFailed'))
    }
  }

  async function apply(ids: string[] = [...selected]) {
    try {
      const result = await batchSet.mutateAsync({
        participant_ids: ids,
        status: target,
        ...(note ? { note } : {}),
      })
      reportBatchResult(result, t('statuses.updated'), t('statuses.updateFailed'))
      setOutcome(result)
      if ((result.failed ?? 0) === 0) {
        setSelected(new Set())
        setNote('')
        setOpen(false)
      }
    } catch {
      toast.error(t('statuses.updateFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <p className="text-copy">{t('statuses.selected', { count: selected.size })}</p>
          <Button size="sm" onClick={openDialog}>
            {t('statuses.changeStatus')}
          </Button>
        </div>
      )}

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={10} columns={7} density="action" />}
      >
        {items.length === 0 ? (
          <EmptyState title={t('statuses.emptyTitle')} description={t('statuses.emptyHint')} />
        ) : (
          <div className="flex flex-col gap-4">
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
              onPreview={setPreviewId}
            />

            <NotificationPreviewDialog
              statusId={previewId}
              open={previewId !== null}
              onOpenChange={(next) => {
                if (!next) setPreviewId(null)
              }}
            />

            {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
          </div>
        )}
      </QueryBoundary>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('statuses.batchTitle')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label={t('statuses.newStatus')} htmlFor="batch-status">
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
                      {t(REGISTRATION_STATUS_KEY[status])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t('statuses.adminNote')} htmlFor="batch-note">
              <Textarea
                id="batch-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            {outcome && (
              <BatchResultPanel
                result={outcome}
                onRetryFailed={(keys) => void apply(keys)}
                isRetrying={batchSet.isPending}
              />
            )}

            <div className="rounded-md border border-dashed p-3 text-copy">
              {previewResult ? (
                <Trans
                  t={t}
                  i18nKey="statuses.previewResult"
                  values={{
                    affected: previewResult.affected,
                    skipped: previewResult.skipped,
                  }}
                  components={{ strong: <strong /> }}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={preview.isPending}
                  onClick={() => runPreview(target)}
                >
                  {t('statuses.preview')}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common:action.cancel')}
            </Button>
            <Button onClick={() => void apply()} disabled={!previewResult || batchSet.isPending}>
              {t('common:action.apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
