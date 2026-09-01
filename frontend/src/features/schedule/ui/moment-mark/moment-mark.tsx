import { memo } from 'react'
import { resolveUrgency } from '@/entities/deadline/urgency/urgency'
import type { MomentItem } from '../../model/row-items'
import { MARK_SIZE } from '../../model/schedule-scale'
import styles from './moment-mark.module.css'

export const MomentMark = memo(MomentMarkView)

export type MomentMarkProps = {
  item: MomentItem
  offset: number
  highlighted: boolean
  now: Date
}

function MomentMarkView({ item, offset, highlighted, now }: MomentMarkProps) {
  const isDeadline = item.moment === 'deadline'
  const urgency = resolveUrgency({
    deadlineAt: item.at,
    status: item.registrationStatus ?? null,
    now,
  })
  const color = isDeadline ? `var(--urgency-${urgency})` : 'var(--stage-checkpoint)'

  return (
    <span
      className={styles.mark}
      data-schedule-mark={item.id}
      data-hollow={isDeadline ? 'false' : 'true'}
      data-urgency={isDeadline ? urgency : undefined}
      data-highlighted={highlighted ? 'true' : 'false'}
      style={{
        left: `${Math.min(1, Math.max(0, offset)) * 100}%`,
        ['--mark-size' as string]: `${MARK_SIZE}px`,
        ['--moment-color' as string]: color,
      }}
    />
  )
}
