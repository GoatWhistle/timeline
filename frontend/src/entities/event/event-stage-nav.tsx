import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
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
  const { containerRef, box } = useSlidingIndicator<HTMLOListElement>(current, 'y')

  return (
    <nav
      aria-label={t('stage.pipeline')}
      className="shrink-0 border-border sm:w-48 sm:border-r sm:pr-3"
    >
      <ol ref={containerRef} className="relative flex flex-col gap-0.5">
        <SlidingIndicator box={box} axis="y" />
        {stages.map((stage, index) => {
          const active = stage.id === current
          const done = index < reached
          return (
            <li key={stage.id} data-stage-step={stage.id} data-stage-done={done ? 'true' : 'false'}>
              <button
                type="button"
                data-indicator-item
                data-indicator-active={active ? 'true' : undefined}
                aria-current={active ? 'step' : undefined}
                onClick={() => onSelect(stage.id)}
                className={cn(
                  'relative z-10 flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-copy',
                  'transition-colors duration-base ease-out',
                  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
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
                <span className="min-w-0 truncate">{t(stage.labelKey)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
