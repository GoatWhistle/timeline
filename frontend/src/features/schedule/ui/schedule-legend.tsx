import {
  STAGE_TYPE_COLOR,
  STAGE_TYPE_ICON,
  STAGE_TYPE_LABEL,
  STAGE_TYPES,
} from '@/entities/stage/stage.labels'
import { cn } from '@/shared/styling/class-names/class-names'

export function ScheduleLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-muted-foreground text-xs">
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
            {STAGE_TYPE_LABEL[type]}
          </li>
        )
      })}
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-destructive" aria-hidden="true" />
        Дедлайн регистрации
      </li>
    </ul>
  )
}
