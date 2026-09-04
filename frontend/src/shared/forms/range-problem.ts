import { isApiError } from '@/shared/api/errors'
import type { RangeProblem } from '@/shared/ui/forms/calendar/moment-range'
import { fieldMessage } from './field-message'

export const MOMENT_FIELDS = ['start_at', 'end_at'] as const

export function serverRangeProblem(error: unknown): RangeProblem | null {
  if (!isApiError(error)) return null
  const problem: RangeProblem = {}
  for (const field of error.fields) {
    if (field.field === 'start_at') problem.start = fieldMessage(field)
    if (field.field === 'end_at') problem.end = fieldMessage(field)
  }
  return problem.start === undefined && problem.end === undefined ? null : problem
}
