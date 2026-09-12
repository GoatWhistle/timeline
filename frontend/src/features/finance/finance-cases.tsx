import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { failureMessage } from '@/shared/api/failure'
import type { EventCaseResponse, FinanceTrack } from '@/shared/api/types.gen'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { CaseForm } from './case-form'
import { CaseRow } from './case-row'
import { useCreateCase, useDeleteCase, useUpdateCase } from './finance.queries'

export function FinanceCases({
  eventId,
  cases,
  tracks,
  currency,
  canEdit,
}: {
  eventId: string
  cases: EventCaseResponse[]
  tracks: FinanceTrack[]
  currency: string | undefined
  canEdit: boolean
}) {
  const { t } = useTranslation('event')
  const create = useCreateCase(eventId)
  const update = useUpdateCase(eventId)
  const remove = useDeleteCase(eventId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EventCaseResponse | null>(null)
  const [deleting, setDeleting] = useState<EventCaseResponse | null>(null)

  return (
    <section className="flex flex-col gap-2" aria-label={t('cases.title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-copy text-muted-foreground">{t('cases.title')}</h3>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('cases.add')}
          </Button>
        )}
      </div>

      {cases.length === 0 ? (
        <p className="text-copy text-muted-foreground">{t('cases.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cases.map((item) => (
            <CaseRow
              key={item.id}
              item={item}
              currency={currency}
              onEdit={canEdit ? () => setEditing(item) : undefined}
              onDelete={canEdit ? () => setDeleting(item) : undefined}
            />
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cases.newTitle')}</DialogTitle>
          </DialogHeader>
          <CaseForm
            tracks={tracks}
            submitLabel={t('list.create')}
            onSubmit={async (payload) => {
              await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success(t('cases.created'))
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cases.editTitle')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <CaseForm
              key={editing.id}
              item={editing}
              tracks={tracks}
              submitLabel={t('common:action.save')}
              onSubmit={async (payload) => {
                await update.mutateAsync({ id: editing.id, body: payload })
                setEditing(null)
                toast.success(t('cases.saved'))
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('cases.confirmDeleteTitle')}
        description={t('cases.confirmDeleteHint', { name: deleting?.name })}
        confirmLabel={t('common:action.delete')}
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove.mutateAsync(deleting.id).catch((error) => toast.error(failureMessage(error)))
          setDeleting(null)
        }}
      />
    </section>
  )
}
