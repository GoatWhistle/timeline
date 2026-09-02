import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { filled } from '@/entities/personal/personal-fields'
import {
  tasksQuery,
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from '@/entities/personal/task.queries'
import { taskTitle } from '@/entities/personal/task-title'
import type { ParticipantTask, StageResponse } from '@/shared/api/types.gen'
import { TaskFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PersonalBoundary } from '../shell/personal-boundary'
import { dueIso, initialValues, stageIdOf, TaskForm, type TaskValues } from './task-form'
import { TaskRow } from './task-row'
import { TemplatePicker } from './template-picker'

export function TaskPanel({ eventId, stages }: { eventId: string; stages: StageResponse[] }) {
  const { t } = useTranslation('event')
  const query = useQuery(tasksQuery(eventId))
  const create = useCreateTask(eventId)
  const update = useUpdateTask(eventId)
  const remove = useDeleteTask(eventId)

  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ParticipantTask | null>(null)

  const items = query.data ?? []
  const done = items.filter((item) => filled(item.done_at)).length

  async function onCreate(values: TaskValues) {
    const due = dueIso(values)
    const stageId = stageIdOf(values)
    await create.mutateAsync({
      title: values.title.trim(),
      ...(values.notes === '' ? {} : { notes: values.notes }),
      ...(due === null ? {} : { due_at: due }),
      ...(stageId === null ? {} : { stage_id: stageId }),
    })
    setComposing(false)
    toast.success(t('personal.tasks.added'))
  }

  async function onSave(task: ParticipantTask, values: TaskValues) {
    const due = dueIso(values)
    const stageId = stageIdOf(values)
    await update.mutateAsync({
      id: task.id,
      body: {
        title: values.title.trim(),
        notes: values.notes,
        ...(due === null ? { clear_due_at: true } : { due_at: due }),
        ...(stageId === null ? { clear_stage: true } : { stage_id: stageId }),
      },
    })
    setEditingId(null)
    toast.success(t('personal.tasks.saved'))
  }

  async function onRemove(task: ParticipantTask) {
    await remove.mutateAsync(task.id)
    setRemoving(null)
    toast.success(t('personal.tasks.removed'))
  }

  return (
    <div className="flex flex-col gap-5">
      <PersonalBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        figure={TaskFigure}
      >
        {items.length === 0 ? (
          <EmptyState
            title={t('personal.tasks.empty')}
            description={t('personal.tasks.emptyHint')}
            figure={TaskFigure}
            action={
              <Button type="button" onClick={() => setComposing(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t('personal.tasks.add')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-meta text-muted-foreground">
              {t('personal.tasks.counter', { done, total: items.length })}
            </p>
            <ul className="flex flex-col gap-2">
              {items.map((task) =>
                task.id === editingId ? (
                  <li
                    key={task.id}
                    className="rounded-control border border-primary bg-accent-surface p-3"
                  >
                    <TaskForm
                      idPrefix={`task-${task.id}`}
                      initial={initialValues(task)}
                      stages={stages}
                      submitLabel={t('common:action.save')}
                      pending={update.isPending}
                      onSubmit={(values) => onSave(task, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <TaskRow
                    key={task.id}
                    task={task}
                    stages={stages}
                    busy={update.isPending}
                    onToggle={(next) =>
                      update.mutateAsync({ id: task.id, body: { done: next } }).catch(() => {})
                    }
                    onEdit={() => {
                      setComposing(false)
                      setEditingId(task.id)
                    }}
                    onRemove={() => setRemoving(task)}
                  />
                ),
              )}
            </ul>
          </div>
        )}
      </PersonalBoundary>

      {composing ? (
        <section className="flex flex-col gap-4 rounded-control border border-border bg-surface-1 p-4">
          <h4 className="font-medium text-copy">{t('personal.tasks.add')}</h4>
          <TaskForm
            idPrefix="task-new"
            initial={initialValues(null)}
            stages={stages}
            submitLabel={t('personal.tasks.add')}
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
              {t('personal.tasks.add')}
            </Button>
          </div>
        )
      )}

      <TemplatePicker eventId={eventId} />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={t('personal.tasks.removeTitle')}
        description={
          removing === null
            ? t('personal.tasks.removeHint')
            : `${taskTitle(removing.title)} — ${t('personal.tasks.removeHint')}`
        }
        destructive
        disabled={remove.isPending}
        onConfirm={() => {
          if (removing !== null) void onRemove(removing)
        }}
      />
    </div>
  )
}
