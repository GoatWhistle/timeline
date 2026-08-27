import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  STAGE_TYPE_COLOR,
  STAGE_TYPE_ICON,
  STAGE_TYPE_KEY,
  STAGE_TYPE_PATTERNED,
} from '@/entities/stage/stage.labels'
import type { TimelineItem } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import {
  BAR_HEIGHT,
  ICON_MIN_WIDTH,
  LABEL_MIN_WIDTH,
  LANE_STEP,
  LANE_TOP,
} from '../model/schedule-scale'

const PATTERN_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(45deg, color-mix(in oklch, currentColor 18%, transparent) 0 3px, transparent 3px 7px)',
}

export function StageBar({
  stage,
  href,
  left,
  width,
  lane,
}: {
  stage: TimelineItem
  href: string
  left: number
  width: number
  lane: number
}) {
  const { t } = useTranslation()
  const Icon = STAGE_TYPE_ICON[stage.type]
  const typeLabel = t(STAGE_TYPE_KEY[stage.type])
  const start = formatDate(stage.start_at)
  const end = formatDate(stage.end_at)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={href}
          aria-label={t('schedule.stageAria', { name: stage.name, type: typeLabel, start, end })}
          className={cn(
            'absolute flex items-center gap-1 overflow-hidden rounded-sm px-1 text-[11px] text-stage-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
            STAGE_TYPE_COLOR[stage.type],
          )}
          style={{
            left,
            width,
            top: LANE_TOP + lane * LANE_STEP,
            height: BAR_HEIGHT,
            ...(STAGE_TYPE_PATTERNED[stage.type] ? PATTERN_STYLE : {}),
          }}
        >
          {width >= ICON_MIN_WIDTH && <Icon className="size-3 shrink-0" aria-hidden="true" />}
          {width >= LABEL_MIN_WIDTH && (
            <span className="truncate" aria-hidden="true">
              {stage.name}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{stage.name}</p>
        <p className="text-muted-foreground">
          {t('schedule.stageTooltip', { type: typeLabel, start, end })}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
