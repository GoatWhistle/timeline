import { useTranslation } from 'react-i18next'
import { filled } from '@/entities/personal/personal-fields'
import { taskTitle } from '@/entities/personal/task-title'
import type { ParticipantTask, StageResponse } from '@/shared/api/types.gen'
import { formatEventMoment, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Badge } from '@/shared/ui/primitives/badge'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

function isOverdue(task: ParticipantTask): boolean {
  if (filled(task.done_at) || !filled(task.due_at)) return false
  const due = Date.parse(task.due_at)
  return Number.isFinite(due) && due < Date.now()
}

export function TaskRow({
  task,
  stages,
  onToggle,
  onEdit,
  onRemove,
  busy,
}: {
  task: ParticipantTask
  stages: StageResponse[]
  onToggle: (done: boolean) => void
  onEdit: () => void
  onRemove: () => void
  busy: boolean
}) {
  const { t } = useTranslation('event')
  const done = filled(task.done_at)
  const name = taskTitle(task.title)
  const overdue = isOverdue(task)
  const stage = filled(task.stage_id)
    ? (stages.find((item) => item.id === task.stage_id) ?? null)
    : null

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-control border border-border bg-card p-3',
        'motion-safe:transition-colors motion-safe:duration-base motion-safe:ease-out',
        done && 'bg-surface-1',
      )}
    >
      <Checkbox
        checked={done}
        disabled={busy}
        onCheckedChange={(next) => onToggle(next === true)}
        aria-label={
          done
            ? t('personal.tasks.markUndone', { title: name })
            : t('personal.tasks.markDone', { title: name })
        }
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-copy', done && 'text-muted-foreground line-through')}>{name}</p>
        {filled(task.notes) && (
          <p className="mt-0.5 whitespace-pre-wrap text-meta text-muted-foreground">{task.notes}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
          {filled(task.due_at) && (
            <span className={overdue ? 'text-destructive' : undefined}>
              {formatEventMoment(task.due_at)} · {formatRelative(task.due_at)}
            </span>
          )}
          {overdue && <Badge tone="danger">{t('personal.tasks.overdue')}</Badge>}
          {stage && <Badge tone="neutral">{stage.name}</Badge>}
        </p>
      </div>

      <EditAction onClick={onEdit} label={t('personal.tasks.edit', { title: name })} />
      <DeleteAction onClick={onRemove} label={t('personal.tasks.remove', { title: name })} />
    </li>
  )
}
