import type { ScheduleResponse } from '@/shared/api/types.gen'
import type { ScheduleScale } from './schedule-scale'

export type EmptyReason = 'none' | 'invitation' | 'account' | 'period'

export function rowsInPeriod(data: ScheduleResponse, from: Date, to: Date): number {
  const start = from.getTime()
  const end = to.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0

  return data.rows.filter((row) => {
    const rowStart = new Date(row.start_at).getTime()
    const rowEnd = new Date(row.end_at).getTime()
    if (!Number.isFinite(rowStart) || !Number.isFinite(rowEnd)) return false
    return rowStart <= end && rowEnd >= start
  }).length
}

export function emptyReason({
  totalRows,
  periodRows,
  scale,
  invitationShown,
}: {
  totalRows: number
  periodRows: number
  scale: ScheduleScale
  invitationShown: boolean
}): EmptyReason {
  if (periodRows > 0) return 'none'
  if (totalRows > 0) return 'period'
  if (!invitationShown) return 'invitation'
  return scale === 'year' ? 'account' : 'period'
}
