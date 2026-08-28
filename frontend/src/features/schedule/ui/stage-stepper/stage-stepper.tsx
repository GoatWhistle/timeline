import { useTranslation } from 'react-i18next'
import type { ScheduleItem } from '@/shared/api/types.gen'
import { formatRelative } from '@/shared/datetime/datetime'
import { stageProgress } from '../../model/stage-progress'
import styles from './stage-stepper.module.css'

export type StageStepperProps = {
  stages: readonly ScheduleItem[]
  now?: Date
}

export function StageStepper({ stages, now = new Date() }: StageStepperProps) {
  const { t } = useTranslation()
  const progress = stageProgress(stages, now)

  if (progress.total === 0) return null

  const current = progress.steps[progress.currentIndex]
  const caption = t('schedule.stepOf', {
    current: progress.currentIndex + 1,
    total: progress.total,
  })

  return (
    <div data-schedule-stepper className="flex flex-col gap-1">
      <ol className={styles.stepper} aria-label={caption}>
        {progress.steps.map((step) => (
          <li
            key={step.id}
            className={styles.step}
            data-state={step.state}
            aria-current={step.state === 'current' ? 'step' : undefined}
            aria-label={step.name}
          />
        ))}
      </ol>
      <p className="text-muted-foreground text-caption">
        {caption}
        {current ? ` · ${current.name}` : ''}
        {current && current.state === 'current'
          ? ` · ${t('schedule.remaining', { remaining: formatRelative(current.stage.end_at, now) })}`
          : ''}
      </p>
    </div>
  )
}
