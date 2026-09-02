import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  EMPTY_RETRO,
  isRetroEmpty,
  RETRO_FIELD_KEY,
  RETRO_FIELD_MAX,
  RETRO_FIELDS,
  type RetroDraft,
  retrospectiveQuery,
  toDraft,
  useDeleteRetrospective,
  useSaveRetrospective,
} from '@/entities/personal/retrospective.queries'
import { RetroFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Field } from '@/shared/ui/forms/field'
import { Textarea } from '@/shared/ui/forms/textarea'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PersonalBoundary } from '../shell/personal-boundary'

export function RetroPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const query = useQuery(retrospectiveQuery(eventId))
  const save = useSaveRetrospective(eventId)
  const remove = useDeleteRetrospective(eventId)

  const [draft, setDraft] = useState<RetroDraft>(EMPTY_RETRO)
  const [loaded, setLoaded] = useState(false)
  const [writing, setWriting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (loaded || query.data === undefined) return
    setDraft(toDraft(query.data))
    setLoaded(true)
  }, [loaded, query.data])

  const stored = query.data === undefined ? null : query.data
  const recorded = stored !== null && !isRetroEmpty(toDraft(stored))
  const tooLong = RETRO_FIELDS.some((field) => draft[field].length > RETRO_FIELD_MAX)

  async function onSave() {
    if (tooLong) return
    await save.mutateAsync({
      went_well: draft.went_well,
      went_badly: draft.went_badly,
      next_time: draft.next_time,
    })
    setWriting(false)
    toast.success(isRetroEmpty(draft) ? t('personal.retro.removed') : t('personal.retro.saved'))
  }

  async function onRemove() {
    await remove.mutateAsync()
    setDraft(EMPTY_RETRO)
    setConfirming(false)
    setWriting(false)
    toast.success(t('personal.retro.removed'))
  }

  const showForm = writing || recorded

  return (
    <div className="flex flex-col gap-5">
      <PersonalBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        figure={RetroFigure}
      >
        {showForm ? (
          <div className="flex flex-col gap-4">
            {RETRO_FIELDS.map((field) => (
              <Field
                key={field}
                label={t(RETRO_FIELD_KEY[field])}
                htmlFor={`retro-${field}`}
                error={
                  draft[field].length > RETRO_FIELD_MAX ? t('personal.retro.tooLong') : undefined
                }
              >
                <Textarea
                  id={`retro-${field}`}
                  rows={4}
                  value={draft[field]}
                  onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                />
              </Field>
            ))}

            <p className="text-caption text-muted-foreground">{t('personal.retro.clearHint')}</p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void onSave()}
                disabled={save.isPending || tooLong}
              >
                {t('common:action.save')}
              </Button>
              {recorded && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(true)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t('personal.retro.remove')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title={t('personal.retro.empty')}
            description={t('personal.retro.emptyHint')}
            figure={RetroFigure}
            action={
              <Button type="button" onClick={() => setWriting(true)}>
                {t('personal.retro.write')}
              </Button>
            }
          />
        )}
      </PersonalBoundary>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('personal.retro.removeTitle')}
        description={t('personal.retro.removeHint')}
        destructive
        disabled={remove.isPending}
        onConfirm={() => void onRemove()}
      />
    </div>
  )
}
