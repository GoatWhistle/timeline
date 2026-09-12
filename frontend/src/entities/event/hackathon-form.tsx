import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useEffect } from 'react'
import { type Control, type FieldErrors, type UseFormRegister, useForm } from 'react-hook-form'
import type { EventResponse } from '@/shared/api/types.gen'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { EventFlatForm } from './event-flat-form'
import {
  buildHackathonPayload,
  type EventFormPayload,
  hackathonDefaults,
} from './event-form.payload'
import {
  HACKATHON_FIELD_NAMES,
  type HackathonFormValues,
  hackathonSchema,
  type MeetupFormValues,
} from './event-form.schema'
import { type StageId, type StagePipeline, stageOfFields } from './event-form.stages'
import { EventPrizeFields } from './event-prize-fields'
import { EventStagePanel } from './event-stage-panel'
import { EventStagedForm } from './event-staged-form'
import { useEventSubmit } from './use-event-submit'

export function HackathonForm({
  event,
  submitLabel,
  cover,
  draft,
  range,
  pipeline,
  staged,
  onKindChange,
  onDraft,
  onRangeChange,
  onSubmit,
}: {
  event?: EventResponse
  submitLabel: string
  cover?: ReactNode
  draft?: Partial<MeetupFormValues>
  range: MomentRange
  pipeline: StagePipeline
  staged: boolean
  onKindChange: (next: 'HACKATHON' | 'MEETUP') => void
  onDraft?: (values: MeetupFormValues) => void
  onRangeChange: (next: MomentRange) => void
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HackathonFormValues>({
    resolver: zodResolver(hackathonSchema),
    defaultValues: { ...hackathonDefaults(event), ...draft },
  })

  const { rangeError, setRangeError, submit } = useEventSubmit<HackathonFormValues>({
    range,
    fieldNames: HACKATHON_FIELD_NAMES,
    build: buildHackathonPayload,
    setError,
    onSubmit,
    onProblem: pipeline.goTo,
    onServerFields: goToStageOf,
  })

  useEffect(() => {
    if (!onDraft) return
    const subscription = watch((values) => onDraft(values as MeetupFormValues))
    return () => subscription.unsubscribe()
  }, [watch, onDraft])

  function goToStageOf(named: string[]) {
    const found = stageOfFields(pipeline.stages, named)
    if (found !== null) pipeline.goTo(found)
  }

  function invalid(problems: Record<string, unknown>) {
    goToStageOf(Object.keys(problems))
  }

  async function next() {
    const fields = pipeline.stage.fields
    if (fields.length > 0 && !(await trigger([...fields]))) return
    pipeline.markDone()
  }

  function panel(stage: StageId) {
    return (
      <EventStagePanel
        stage={stage}
        kind="HACKATHON"
        kindLocked={!staged}
        onKindChange={onKindChange}
        control={control as unknown as Control<MeetupFormValues>}
        register={register as unknown as UseFormRegister<MeetupFormValues>}
        errors={errors as FieldErrors<MeetupFormValues>}
        format={watch('format')}
        range={range}
        rangeError={rangeError}
        onOrganizerPick={(value) =>
          setValue('organizer', value, { shouldDirty: true, shouldValidate: true })
        }
        onRangeChange={(nextRange) => {
          onRangeChange(nextRange)
          setRangeError(null)
        }}
        prize={<EventPrizeFields control={control} errors={errors} />}
      />
    )
  }

  if (!staged) {
    return (
      <EventFlatForm
        kind="HACKATHON"
        stages={pipeline.stages}
        submitLabel={submitLabel}
        busy={isSubmitting}
        rootError={errors.root?.message}
        cover={cover}
        renderStage={(stage) => panel(stage.id)}
        onSubmit={handleSubmit(submit, invalid)}
      />
    )
  }

  return (
    <EventStagedForm
      kind="HACKATHON"
      pipeline={pipeline}
      submitLabel={submitLabel}
      busy={isSubmitting}
      rootError={errors.root?.message}
      cover={cover}
      onGoTo={(id: StageId) => pipeline.goTo(id)}
      onNext={next}
      onSubmit={handleSubmit(submit, invalid)}
    >
      {panel(pipeline.stage.id)}
    </EventStagedForm>
  )
}
