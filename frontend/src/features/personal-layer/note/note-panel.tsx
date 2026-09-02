import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NOTE_MAX, noteQuery, useSaveNote } from '@/entities/personal/note.queries'
import { NoteFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { Field } from '@/shared/ui/forms/field'
import { Textarea } from '@/shared/ui/forms/textarea'
import { PersonalBoundary } from '../shell/personal-boundary'
import { useAutosave } from './use-autosave'

export function NotePanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const query = useQuery(noteQuery(eventId))
  const save = useSaveNote(eventId)

  const [draft, setDraft] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded || query.data === undefined) return
    setDraft(query.data)
    setLoaded(true)
  }, [loaded, query.data])

  const autosave = useAutosave((value) => save.mutateAsync(value))
  const tooLong = draft.length > NOTE_MAX

  function onChange(value: string) {
    setDraft(value)
    if (value.length > NOTE_MAX) return
    autosave.schedule(value)
  }

  return (
    <PersonalBoundary
      isPending={query.isPending}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      figure={NoteFigure}
    >
      <div className="flex flex-col gap-3">
        <Field
          label={t('personal.note.label')}
          htmlFor="personal-note"
          hint={t('personal.note.clearHint')}
          error={tooLong ? t('personal.note.tooLong') : undefined}
        >
          <Textarea
            id="personal-note"
            rows={10}
            value={draft}
            placeholder={t('personal.note.placeholder')}
            onChange={(event) => onChange(event.target.value)}
            onBlur={autosave.flush}
            className="font-mono"
          />
        </Field>

        <p aria-live="polite" className="flex items-center gap-1.5 text-meta text-muted-foreground">
          {autosave.state === 'saving' && (
            <>
              <Loader2
                className="size-3.5 motion-safe:animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {t('personal.note.saving')}
            </>
          )}
          {autosave.state === 'saved' && (
            <>
              <Check className="size-3.5" aria-hidden="true" />
              {t('personal.note.saved')}
            </>
          )}
          {autosave.state === 'failed' && (
            <span className="text-destructive">{t('personal.note.saveFailed')}</span>
          )}
        </p>
      </div>
    </PersonalBoundary>
  )
}
