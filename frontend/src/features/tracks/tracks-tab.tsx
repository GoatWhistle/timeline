import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { eventTracksQuery } from '@/entities/event/event.queries'
import type { EventResponse, EventTrackResponse } from '@/shared/api/types.gen'
import { OutcomeFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { useCreateTrack, useDeleteTrack, useUpdateTrack } from './track.queries'
import { headroomOf, TrackBudget } from './track-budget'
import { TrackForm } from './track-form'
import { canMoveTrack, moveTrack, sortedTracks } from './track-order'
import { TrackRow } from './track-row'

export function TracksTab({ event }: { event: EventResponse }) {
  const { t } = useTranslation('event')
  const query = useQuery(eventTracksQuery(event.id))
  const create = useCreateTrack(event.id)
  const update = useUpdateTrack(event.id)
  const remove = useDeleteTrack(event.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EventTrackResponse | null>(null)
  const [deleting, setDeleting] = useState<EventTrackResponse | null>(null)

  if (event.kind !== 'HACKATHON') {
    return <p className="text-copy text-muted-foreground">{t('tracks.hackathonOnly')}</p>
  }

  const data = query.data
  const tracks = sortedTracks(data?.items ?? [])
  const currency = data?.prize_currency ?? undefined

  async function reorder(id: string, direction: -1 | 1) {
    const changes = moveTrack(tracks, id, direction)
    if (changes.length === 0) {
      toast.error(t('tracks.reorderFailed'))
      return
    }
    for (const change of changes) {
      await update.mutateAsync({ id: change.id, body: { track_no: change.track_no } })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {data && <TrackBudget tracks={data} />}

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {t('tracks.add')}
        </Button>
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={data !== undefined}
        skeleton={<SkeletonTable rows={3} columns={3} density="action" />}
      >
        {tracks.length === 0 ? (
          <EmptyState
            title={t('tracks.emptyTitle')}
            description={t('tracks.emptyHint')}
            figure={OutcomeFigure}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t('tracks.add')}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                currency={currency}
                busy={update.isPending}
                canUp={canMoveTrack(tracks, track.id, -1)}
                canDown={canMoveTrack(tracks, track.id, 1)}
                onUp={() => reorder(track.id, -1)}
                onDown={() => reorder(track.id, 1)}
                onEdit={() => setEditing(track)}
                onDelete={() => setDeleting(track)}
              />
            ))}
          </ul>
        )}
      </QueryBoundary>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tracks.newTitle')}</DialogTitle>
          </DialogHeader>
          <TrackForm
            currency={currency}
            headroom={data ? headroomOf(data) : null}
            submitLabel={t('list.create')}
            onSubmit={async (payload) => {
              await create.mutateAsync(payload)
              setCreateOpen(false)
              toast.success(t('tracks.created'))
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tracks.editTitle')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <TrackForm
              key={editing.id}
              track={editing}
              currency={currency}
              headroom={data ? headroomOf(data, editing.prize_total) : null}
              submitLabel={t('common:action.save')}
              onSubmit={async (payload) => {
                await update.mutateAsync({
                  id: editing.id,
                  body: { ...payload, set_prizes: true },
                })
                setEditing(null)
                toast.success(t('tracks.saved'))
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('tracks.confirmDeleteTitle')}
        description={t('tracks.confirmDeleteHint', { name: deleting?.name })}
        confirmLabel={t('common:action.delete')}
        destructive
        disabled={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await remove.mutateAsync(deleting.id).catch(() => toast.error(t('tracks.deleteFailed')))
          setDeleting(null)
        }}
      />
    </div>
  )
}
