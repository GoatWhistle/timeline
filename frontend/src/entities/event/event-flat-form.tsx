import type { FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventKind } from '@/shared/api/types.gen'
import { Button } from '@/shared/ui/primitives/button'
import type { StageDefinition } from './event-form.stages'

export function EventFlatForm({
  kind,
  stages,
  submitLabel,
  busy,
  rootError,
  cover,
  renderStage,
  onSubmit,
}: {
  kind: EventKind
  stages: StageDefinition[]
  submitLabel: string
  busy: boolean
  rootError?: string | undefined
  cover?: ReactNode
  renderStage: (stage: StageDefinition) => ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
}) {
  const { t } = useTranslation('event')

  return (
    <form
      className="flex flex-col gap-8"
      data-event-form={kind}
      data-event-layout="flat"
      onSubmit={onSubmit}
      noValidate
    >
      {stages.map((stage) => {
        const headingId = `event-section-${stage.id}-heading`
        return (
          <section
            key={stage.id}
            aria-labelledby={headingId}
            data-stage-section={stage.id}
            className="flex flex-col gap-5"
          >
            <h3 id={headingId} className="font-semibold text-heading">
              {t(stage.labelKey)}
            </h3>
            {renderStage(stage)}
            {stage.id === 'basics' && cover}
          </section>
        )
      })}

      {rootError && (
        <p role="alert" className="text-copy text-destructive">
          {rootError}
        </p>
      )}

      <div className="flex items-center gap-2 border-border border-t pt-4">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
