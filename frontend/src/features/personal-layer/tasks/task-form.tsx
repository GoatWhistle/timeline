import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { filled, textOf } from '@/entities/personal/personal-fields'
import { taskTitle } from '@/entities/personal/task-title'
import type { ParticipantTask, StageResponse } from '@/shared/api/types.gen'
import { type Civil, civilFromIso, civilToIso, EMPTY_CIVIL, isCivil } from '@/shared/datetime/civil'
import { MomentField } from '@/shared/ui/forms/calendar/moment-field'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'

export type TaskValues = {
  title: string
  notes: string
  due: Civil
  stageId: string
}

const NO_STAGE = 'none'

export function initialValues(task: ParticipantTask | null): TaskValues {
  if (task === null) return { title: '', notes: '', due: EMPTY_CIVIL, stageId: NO_STAGE }
  return {
    title: taskTitle(task.title),
    notes: textOf(task.notes),
    due: filled(task.due_at) ? civilFromIso(task.due_at) : EMPTY_CIVIL,
    stageId: filled(task.stage_id) ? task.stage_id : NO_STAGE,
  }
}

export function dueIso(values: TaskValues): string | null {
  return isCivil(values.due) ? civilToIso(values.due) : null
}

export function stageIdOf(values: TaskValues): string | null {
  return values.stageId === NO_STAGE ? null : values.stageId
}

export function TaskForm({
  idPrefix,
  initial,
  stages,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  initial: TaskValues
  stages: StageResponse[]
  submitLabel: string
  pending: boolean
  onSubmit: (values: TaskValues) => void
  onCancel?: () => void
}) {
  const { t } = useTranslation('event')
  const [values, setValues] = useState<TaskValues>(initial)
  const [touched, setTouched] = useState(false)

  const blank = values.title.trim() === ''
  const titleError = touched && blank ? t('personal.tasks.titleRequired') : undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (blank) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label={t('personal.tasks.titleLabel')}
        htmlFor={`${idPrefix}-title`}
        error={titleError}
        required
      >
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          maxLength={200}
          placeholder={t('personal.tasks.titlePlaceholder')}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
        />
      </Field>

      <Field label={t('personal.tasks.notesLabel')} htmlFor={`${idPrefix}-notes`}>
        <Textarea
          id={`${idPrefix}-notes`}
          rows={2}
          value={values.notes}
          onChange={(event) => setValues({ ...values, notes: event.target.value })}
        />
      </Field>

      <MomentField
        id={`${idPrefix}-due`}
        label={t('personal.tasks.dueLabel')}
        value={values.due}
        hint={t('personal.tasks.dueHint')}
        onChange={(due) => setValues({ ...values, due })}
      />

      {stages.length > 0 && (
        <Field label={t('personal.tasks.stageLabel')} htmlFor={`${idPrefix}-stage`}>
          <Select
            value={values.stageId}
            onValueChange={(stageId) => setValues({ ...values, stageId })}
          >
            <SelectTrigger id={`${idPrefix}-stage`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_STAGE}>{t('personal.tasks.noStage')}</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common:action.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
