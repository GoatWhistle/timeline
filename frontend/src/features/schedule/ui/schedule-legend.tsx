import { useTranslation } from 'react-i18next'
import {
  STAGE_TYPE_COLOR,
  STAGE_TYPE_ICON,
  STAGE_TYPE_KEY,
  STAGE_TYPES,
} from '@/entities/stage/stage.labels'
import { cn } from '@/shared/styling/class-names/class-names'

export function ScheduleLegend() {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-wrap gap-3 text-muted-foreground text-caption">
      {STAGE_TYPES.map((type) => {
        const Icon = STAGE_TYPE_ICON[type]
        return (
          <li key={type} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-sm text-stage-foreground',
                STAGE_TYPE_COLOR[type],
              )}
              aria-hidden="true"
            >
              <Icon className="size-2.5" />
            </span>
            {t(STAGE_TYPE_KEY[type])}
          </li>
        )
      })}
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-destructive" aria-hidden="true" />
        {t('schedule.registrationDeadline')}
      </li>
    </ul>
  )
}
