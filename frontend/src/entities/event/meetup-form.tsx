import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { EventResponse } from '@/shared/api/types.gen'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { EventFlatForm } from './event-flat-form'
import { buildMeetupPayload, commonDefaults, type EventFormPayload } from './event-form.payload'
import { COMMON_FIELD_NAMES, type MeetupFormValues, meetupSchema } from './event-form.schema'
import { type StageId, type StagePipeline, stageOfFields } from './event-form.stages'
import { EventStagePanel } from './event-stage-panel'
import { EventStagedForm } from './event-staged-form'
import { useEventSubmit } from './use-event-submit'

export function MeetupForm({
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
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetupFormValues>({
    resolver: zodResolver(meetupSchema),
    defaultValues: { ...commonDefaults(event), ...draft },
  })

  const { rangeError, setRangeError, submit } = useEventSubmit<MeetupFormValues>({
    range,
    fieldNames: COMMON_FIELD_NAMES,
    build: buildMeetupPayload,
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
    const fields = pipeline.stage.fields as readonly (keyof MeetupFormValues)[]
    if (fields.length > 0 && !(await trigger([...fields]))) return
    pipeline.markDone()
  }

  function panel(stage: StageId) {
    return (
      <EventStagePanel
        stage={stage}
        kind="MEETUP"
        onKindChange={onKindChange}
        control={control}
        register={register}
        errors={errors}
        format={watch('format')}
        range={range}
        rangeError={rangeError}
        onRangeChange={(nextRange) => {
          onRangeChange(nextRange)
          setRangeError(null)
        }}
      />
    )
  }

  if (!staged) {
    return (
      <EventFlatForm
        kind="MEETUP"
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
      kind="MEETUP"
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
