import type { FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventKind } from '@/shared/api/types.gen'
import { Button } from '@/shared/ui/primitives/button'
import type { StageDefinition } from './event-form.stages'

const LEADING: readonly string[] = ['kind', 'basics']

function columns(stages: StageDefinition[]): StageDefinition[][] {
  const lead = stages.filter((stage) => LEADING.includes(stage.id))
  const rest = stages.filter((stage) => !LEADING.includes(stage.id))
  return rest.length === 0 ? [lead] : [lead, rest]
}

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
      className="@container flex flex-col gap-8"
      data-event-form={kind}
      data-event-layout="flat"
      onSubmit={onSubmit}
      noValidate
    >
      <div className="grid items-start gap-8 @2xl:grid-cols-2 @2xl:gap-x-10">
        {columns(stages).map((column, index) => (
          <div
            key={column.map((stage) => stage.id).join('-')}
            data-form-column={index}
            className="flex min-w-0 flex-col gap-8"
          >
            {column.map((stage) => {
              const headingId = `event-section-${stage.id}-heading`
              return (
                <section
                  key={stage.id}
                  aria-labelledby={headingId}
                  data-stage-section={stage.id}
                  className="flex min-w-0 flex-col gap-5"
                >
                  <h3 id={headingId} className="font-semibold text-heading">
                    {t(stage.labelKey)}
                  </h3>
                  {renderStage(stage)}
                  {stage.id === 'basics' && cover}
                </section>
              )
            })}
          </div>
        ))}
      </div>

      {rootError && (
        <p role="alert" className="text-copy text-destructive">
          {rootError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
