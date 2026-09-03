import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { FormEvent, FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventKind } from '@/shared/api/types.gen'
import { Button } from '@/shared/ui/primitives/button'
import type { StageId, StagePipeline } from './event-form.stages'
import { EventStageNav } from './event-stage-nav'

export function EventStagedForm({
  kind,
  pipeline,
  submitLabel,
  busy,
  rootError,
  cover,
  onGoTo,
  onNext,
  onSubmit,
  children,
}: {
  kind: EventKind
  pipeline: StagePipeline
  submitLabel: string
  busy: boolean
  rootError?: string | undefined
  cover?: ReactNode
  onGoTo: (id: StageId) => void
  onNext: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}) {
  const { t } = useTranslation('event')
  const { stages, stage, index, reached, retreat } = pipeline
  const headingId = `event-stage-${stage.id}-heading`
  const last = index === stages.length - 1

  function guardedSubmit(event: FormEvent<HTMLFormElement>) {
    if (!last) {
      event.preventDefault()
      onNext()
      return
    }
    onSubmit(event)
  }

  return (
    <form
      className="flex flex-col gap-6 sm:flex-row sm:gap-8"
      data-event-form={kind}
      data-event-stage={stage.id}
      onSubmit={guardedSubmit}
      noValidate
    >
      <EventStageNav stages={stages} current={stage.id} reached={reached} onSelect={onGoTo} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-stage flex-1 flex-col justify-start py-1">
          <section
            key={stage.id}
            aria-labelledby={headingId}
            data-stage-panel={stage.id}
            className="flex flex-col gap-5 motion-safe:animate-stage-in"
          >
            <h3 id={headingId} className="font-semibold text-heading">
              {t(stage.labelKey)}
            </h3>
            {children}
            {stage.id === 'basics' && cover}
          </section>
        </div>

        {rootError && (
          <p role="alert" className="pb-4 text-copy text-destructive">
            {rootError}
          </p>
        )}

        <div
          data-stage-footer=""
          className="mt-6 flex flex-wrap items-center gap-2 border-border border-t pt-4"
        >
          {index > 0 && (
            <Button type="button" variant="ghost" data-stage-back="" onClick={retreat}>
              <ArrowLeft aria-hidden="true" />
              {t('common:action.back')}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {last ? (
              <Button type="submit" disabled={busy}>
                {submitLabel}
              </Button>
            ) : (
              <Button type="button" onClick={onNext}>
                {t('stage.next')}
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
