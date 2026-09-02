import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  artifactsQuery,
  useCreateArtifact,
  useDeleteArtifact,
  useUpdateArtifact,
} from '@/entities/personal/artifact.queries'
import type { ParticipantArtifact } from '@/shared/api/types.gen'
import { ArtifactFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PersonalBoundary } from '../shell/personal-boundary'
import { ArtifactForm, type ArtifactValues, artifactInitial } from './artifact-form'
import { ArtifactRow } from './artifact-row'

export function ArtifactPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const query = useQuery(artifactsQuery(eventId))
  const create = useCreateArtifact(eventId)
  const update = useUpdateArtifact(eventId)
  const remove = useDeleteArtifact(eventId)

  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ParticipantArtifact | null>(null)

  const items = query.data ?? []

  async function onCreate(values: ArtifactValues) {
    await create.mutateAsync({
      kind: values.kind,
      url: values.url,
      ...(values.title.trim() === '' ? {} : { title: values.title.trim() }),
    })
    setComposing(false)
    toast.success(t('personal.artifacts.added'))
  }

  async function onSave(artifact: ParticipantArtifact, values: ArtifactValues) {
    const title = values.title.trim()
    await update.mutateAsync({
      id: artifact.id,
      body: {
        kind: values.kind,
        url: values.url,
        ...(title === '' ? { clear_title: true } : { title }),
      },
    })
    setEditingId(null)
    toast.success(t('personal.artifacts.saved'))
  }

  async function onRemove(artifact: ParticipantArtifact) {
    await remove.mutateAsync(artifact.id)
    setRemoving(null)
    toast.success(t('personal.artifacts.removed'))
  }

  return (
    <div className="flex flex-col gap-5">
      <PersonalBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        figure={ArtifactFigure}
      >
        {items.length === 0 ? (
          <EmptyState
            title={t('personal.artifacts.empty')}
            description={t('personal.artifacts.emptyHint')}
            figure={ArtifactFigure}
            action={
              <Button type="button" onClick={() => setComposing(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t('personal.artifacts.add')}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((artifact) =>
              artifact.id === editingId ? (
                <li
                  key={artifact.id}
                  className="rounded-control border border-primary bg-accent-surface p-3"
                >
                  <ArtifactForm
                    idPrefix={`artifact-${artifact.id}`}
                    initial={artifactInitial(artifact)}
                    submitLabel={t('common:action.save')}
                    pending={update.isPending}
                    onSubmit={(values) => onSave(artifact, values)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  busy={update.isPending}
                  onToggle={(next) =>
                    update
                      .mutateAsync({ id: artifact.id, body: { submitted: next } })
                      .catch(() => {})
                  }
                  onEdit={() => {
                    setComposing(false)
                    setEditingId(artifact.id)
                  }}
                  onRemove={() => setRemoving(artifact)}
                />
              ),
            )}
          </ul>
        )}
      </PersonalBoundary>

      <p className="text-caption text-muted-foreground">{t('personal.artifacts.selfReport')}</p>

      {composing ? (
        <section className="flex flex-col gap-4 rounded-control border border-border bg-surface-1 p-4">
          <h4 className="font-medium text-copy">{t('personal.artifacts.add')}</h4>
          <ArtifactForm
            idPrefix="artifact-new"
            initial={artifactInitial(null)}
            submitLabel={t('personal.artifacts.add')}
            pending={create.isPending}
            onSubmit={onCreate}
            onCancel={() => setComposing(false)}
          />
        </section>
      ) : (
        items.length > 0 && (
          <div>
            <Button type="button" variant="outline" onClick={() => setComposing(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('personal.artifacts.add')}
            </Button>
          </div>
        )
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={t('personal.artifacts.removeTitle')}
        description={t('personal.artifacts.removeHint')}
        destructive
        disabled={remove.isPending}
        onConfirm={() => {
          if (removing !== null) void onRemove(removing)
        }}
      />
    </div>
  )
}
