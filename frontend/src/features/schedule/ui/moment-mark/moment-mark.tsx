import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveUrgency } from '@/entities/deadline/urgency/urgency'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import type { MomentItem } from '../../model/row-items'
import { DIAMOND_HIT, DIAMOND_SIZE } from '../../model/schedule-scale'
import styles from './moment-mark.module.css'

export const MomentMark = memo(MomentMarkView)

export type MomentMarkProps = {
  item: MomentItem
  left: number
  top: number
  highlighted: boolean
  focused: boolean
  now: Date
  onFocusItem: () => void
}

function MomentMarkView({
  item,
  left,
  top,
  highlighted,
  focused,
  now,
  onFocusItem,
}: MomentMarkProps) {
  const { t } = useTranslation()
  const isDeadline = item.moment === 'deadline'
  const urgency = resolveUrgency({ deadlineAt: item.at, now })
  const color = isDeadline ? `var(--urgency-${urgency})` : 'var(--stage-checkpoint)'
  const date = formatDateTime(item.at)
  const remaining = formatRelative(item.at, now)

  const label = isDeadline
    ? t('schedule.registrationDeadlineAria', { date })
    : t('schedule.checkpointAria', { name: item.name, date })

  return (
    <>
      {isDeadline && (
        <span
          className={styles.tick}
          style={{ left, ['--moment-color' as string]: color }}
          aria-hidden="true"
        />
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            data-schedule-item={item.id}
            data-hollow={isDeadline ? 'false' : 'true'}
            data-highlighted={highlighted ? 'true' : 'false'}
            data-focused={focused ? 'true' : 'false'}
            aria-label={label}
            onFocus={onFocusItem}
            className={styles.mark}
            style={{
              left,
              top,
              ['--diamond-size' as string]: `${DIAMOND_SIZE}px`,
              ['--diamond-hit' as string]: `${DIAMOND_HIT}px`,
              ['--moment-color' as string]: color,
            }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {isDeadline ? t('schedule.registrationDeadline') : item.name}
          </p>
          <p className="text-muted-foreground">{date}</p>
          <p className="text-muted-foreground">{remaining}</p>
        </TooltipContent>
      </Tooltip>
    </>
  )
}
