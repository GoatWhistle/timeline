import type * as React from 'react'
import type { EmptyReason } from '@/features/schedule/model/empty-reason'
import styles from './schedule-empty.module.css'

export function ScheduleEmpty({
  reason,
  children,
}: {
  reason: EmptyReason
  children: React.ReactNode
}) {
  return (
    <div className={styles.frame} data-schedule-empty={reason}>
      {children}
    </div>
  )
}
