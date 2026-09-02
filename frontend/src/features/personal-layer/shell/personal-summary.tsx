import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { artifactsQuery } from '@/entities/personal/artifact.queries'
import { noteQuery } from '@/entities/personal/note.queries'
import { filled } from '@/entities/personal/personal-fields'
import { tasksQuery } from '@/entities/personal/task.queries'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { PERSONAL_SECTION_ID } from './personal-section'

export function PersonalSummary({ eventId, enabled }: { eventId: string; enabled: boolean }) {
  const { t } = useTranslation('event')
  const tasks = useQuery({ ...tasksQuery(eventId), enabled })
  const note = useQuery({ ...noteQuery(eventId), enabled })
  const artifacts = useQuery({ ...artifactsQuery(eventId), enabled })

  if (!enabled) return null

  const items = tasks.data ?? []
  const done = items.filter((task) => filled(task.done_at)).length
  const noteKept = filled(note.data)
  const submissions = artifacts.data?.length ?? 0
  const bare = items.length === 0 && !noteKept && submissions === 0

  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-1.5 font-medium text-caption text-muted-foreground uppercase tracking-wide">
        <Lock className="size-3.5" aria-hidden="true" />
        {t('personal.summary.title')}
      </h3>

      {bare ? (
        <p className="text-meta text-muted-foreground">{t('personal.summary.nothing')}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {items.length > 0 && (
            <Badge tone="neutral">
              {t('personal.summary.tasks', { done, total: items.length })}
            </Badge>
          )}
          {noteKept && <Badge tone="neutral">{t('personal.summary.noteKept')}</Badge>}
          {submissions > 0 && (
            <Badge tone="neutral">{t('personal.summary.artifacts', { count: submissions })}</Badge>
          )}
        </div>
      )}

      <div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/events/${eventId}#${PERSONAL_SECTION_ID}`}>{t('personal.summary.open')}</Link>
        </Button>
      </div>
    </section>
  )
}
