import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { outcomeQuery, useDeleteOutcome, useSaveOutcome } from '@/entities/personal/outcome.queries'
import { OutcomeFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PersonalBoundary } from '../shell/personal-boundary'
import { OutcomeForm, outcomeInitial, toRequest } from './outcome-form'

export function OutcomePanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const query = useQuery(outcomeQuery(eventId))
  const save = useSaveOutcome(eventId)
  const remove = useDeleteOutcome(eventId)

  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const outcome = query.data ?? null
  const showForm = editing || outcome !== null

  async function onRemove() {
    await remove.mutateAsync()
    setConfirming(false)
    setEditing(false)
    toast.success(t('personal.outcome.removed'))
  }

  return (
    <div className="flex flex-col gap-5">
      <PersonalBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        figure={OutcomeFigure}
      >
        {showForm ? (
          <OutcomeForm
            key={outcome === null ? 'new' : 'existing'}
            initial={outcomeInitial(outcome)}
            pending={save.isPending}
            onSubmit={async (values) => {
              await save.mutateAsync(toRequest(values))
              setEditing(false)
              toast.success(t('personal.outcome.saved'))
            }}
          />
        ) : (
          <EmptyState
            title={t('personal.outcome.empty')}
            description={t('personal.outcome.emptyHint')}
            figure={OutcomeFigure}
            action={
              <Button type="button" onClick={() => setEditing(true)}>
                {t('personal.outcome.record')}
              </Button>
            }
          />
        )}
      </PersonalBoundary>

      <p className="text-caption text-muted-foreground">{t('personal.outcome.selfReport')}</p>

      {outcome !== null && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(true)}
            disabled={remove.isPending}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('personal.outcome.remove')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('personal.outcome.removeTitle')}
        description={t('personal.outcome.removeHint')}
        destructive
        disabled={remove.isPending}
        onConfirm={() => void onRemove()}
      />
    </div>
  )
}
