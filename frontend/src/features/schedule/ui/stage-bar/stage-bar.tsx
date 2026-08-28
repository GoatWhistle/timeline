import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  STAGE_TYPE_COLOR,
  STAGE_TYPE_ICON,
  STAGE_TYPE_KEY,
  STAGE_TYPE_PATTERNED,
} from '@/entities/stage/stage.labels'
import { EVENT_FORMAT_ICON, placeCity, placeLabel } from '@/entities/stage/stage.place'
import { formatDate } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { measureText } from '@/shared/styling/measure-text/measure-text'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import { placeBarLabel } from '../../model/bar-label'
import type { BarItem } from '../../model/row-items'
import { BAR_HEIGHT, BAR_RADIUS, ICON_MIN_WIDTH, PLACE_MIN_WIDTH } from '../../model/schedule-scale'
import styles from './stage-bar.module.css'

export const StageBar = memo(StageBarView)

const LABEL_FONT = '500 11px "Geist Variable", system-ui, sans-serif'

export type StageBarProps = {
  item: BarItem
  left: number
  width: number
  top: number
  canvasWidth: number
  spaceAfter: number
  labelAbove: boolean
  focused: boolean
  onFocusItem: () => void
}

function StageBarView({
  item,
  left,
  width,
  top,
  canvasWidth,
  spaceAfter,
  labelAbove,
  focused,
  onFocusItem,
}: StageBarProps) {
  const { t } = useTranslation()
  const { stage } = item
  const Icon = STAGE_TYPE_ICON[stage.type]
  const typeLabel = t(STAGE_TYPE_KEY[stage.type])
  const start = formatDate(item.startAt)
  const end = formatDate(item.endAt)
  const city = placeCity(stage.place)
  const PlaceIcon = EVENT_FORMAT_ICON[stage.place.format]
  const showPlace = Boolean(city) && width >= PLACE_MIN_WIDTH && !labelAbove
  const placeText = placeLabel(stage.place, t('event:place.online'))

  const textWidth = measureText(stage.name, LABEL_FONT)
  const reserved = width >= ICON_MIN_WIDTH ? 18 : 0
  const label = placeBarLabel({
    left,
    width,
    textWidth: textWidth + reserved,
    canvasWidth,
    spaceAfter,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          data-schedule-item={item.id}
          data-unconfirmed={item.unconfirmed ? 'true' : 'false'}
          data-patterned={STAGE_TYPE_PATTERNED[stage.type] ? 'true' : 'false'}
          data-clipped-start={left <= 0 ? 'true' : 'false'}
          data-clipped-end={left + width >= canvasWidth ? 'true' : 'false'}
          data-focused={focused ? 'true' : 'false'}
          data-roomy={width >= ICON_MIN_WIDTH ? 'true' : 'false'}
          aria-label={t('schedule.stageAria', { name: stage.name, type: typeLabel, start, end })}
          onFocus={onFocusItem}
          className={cn(styles.bar, !item.unconfirmed && STAGE_TYPE_COLOR[stage.type])}
          style={{
            left,
            width,
            top,
            ['--bar-height' as string]: `${BAR_HEIGHT}px`,
            ['--bar-radius' as string]: `${BAR_RADIUS}px`,
          }}
        >
          {width >= ICON_MIN_WIDTH && <Icon className="size-3 shrink-0" aria-hidden="true" />}
          {showPlace && (
            <span className="ml-auto flex shrink-0 items-center gap-0.5" aria-hidden="true">
              <PlaceIcon className="size-3" />
              <span className="truncate">{city}</span>
            </span>
          )}
          {(labelAbove || label.placement !== 'hidden') && (
            <span
              className={labelAbove ? styles.above : styles.label}
              data-placement={labelAbove ? 'above' : label.placement}
              style={labelAbove ? { left: 0, top: -14 } : { left: label.offset }}
              aria-hidden="true"
            >
              {stage.name}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{stage.name}</p>
        <p className="text-muted-foreground">
          {t('schedule.stageTooltip', { type: typeLabel, start, end })}
        </p>
        <p className="text-muted-foreground">{placeText}</p>
      </TooltipContent>
    </Tooltip>
  )
}
