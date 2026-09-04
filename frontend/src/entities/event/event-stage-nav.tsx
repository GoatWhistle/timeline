import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import type { StageDefinition, StageId } from './event-form.stages'

export function EventStageNav({
  stages,
  current,
  reached,
  onSelect,
}: {
  stages: StageDefinition[]
  current: StageId
  reached: number
  onSelect: (id: StageId) => void
}) {
  const { t } = useTranslation('event')
  const phone = usePhoneViewport()
  const axis = phone ? 'x' : 'y'
  const { containerRef, box } = useSlidingIndicator<HTMLOListElement>(current, axis)

  return (
    <nav
      aria-label={t('stage.pipeline')}
      data-stage-nav={phone ? 'compact' : 'full'}
      className="shrink-0 border-border sm:w-48 sm:border-r sm:pr-3"
    >
      <ol
        ref={containerRef}
        className={cn('relative gap-0.5', phone ? 'flex items-stretch' : 'flex flex-col')}
      >
        <SlidingIndicator box={box} axis={axis} />
        {stages.map((stage, index) => {
          const active = stage.id === current
          const done = index < reached
          return (
            <li
              key={stage.id}
              data-stage-step={stage.id}
              data-stage-done={done ? 'true' : 'false'}
              className={phone ? 'min-w-0 flex-1' : undefined}
            >
              <button
                type="button"
                data-indicator-item
                data-indicator-active={active ? 'true' : undefined}
                aria-current={active ? 'step' : undefined}
                aria-label={phone ? t(stage.labelKey) : undefined}
                onClick={() => onSelect(stage.id)}
                className={cn(
                  'relative z-10 flex w-full items-center rounded-control text-copy',
                  'transition-colors duration-base ease-out',
                  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                  phone
                    ? 'min-h-tap flex-col justify-center gap-1 px-1 py-2'
                    : 'gap-2.5 px-3 py-2 text-left',
                  active
                    ? 'font-medium text-accent-surface-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-pill border text-caption tabular-nums',
                    'motion-safe:transition-[color,background-color,border-color]',
                    'motion-safe:duration-base motion-safe:ease-out',
                    done && 'border-primary bg-primary text-primary-foreground',
                    !done && active && 'border-primary text-primary',
                    !done && !active && 'border-border',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                {phone ? (
                  active && (
                    <span className="min-w-0 truncate text-caption">{t(stage.labelKey)}</span>
                  )
                ) : (
                  <span className="min-w-0 truncate">{t(stage.labelKey)}</span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
