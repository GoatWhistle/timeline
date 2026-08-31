import type { RegistrationStatusValue } from '@/shared/api/types.gen'

export type TeamProgress = {
  done: number
  required: number
  waived: number
  pending: number
}

export type StatusCarrier = { status: RegistrationStatusValue }

export function teamProgress(rows: readonly StatusCarrier[]): TeamProgress {
  let done = 0
  let waived = 0

  for (const row of rows) {
    if (row.status === 'DONE') done += 1
    else if (row.status === 'NOT_REQUIRED') waived += 1
  }

  const required = rows.length - waived
  return { done, required, waived, pending: required - done }
}

export function progressRatio(progress: TeamProgress): number {
  if (progress.required <= 0) return 1
  return progress.done / progress.required
}
