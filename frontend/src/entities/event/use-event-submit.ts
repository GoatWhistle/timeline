import { useState } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'
import { serverRangeProblem } from '@/shared/forms/range-problem'
import { applyServerErrors } from '@/shared/forms/server-errors'
import {
  type MomentRange,
  type RangeProblem,
  rangeProblem,
} from '@/shared/ui/forms/calendar/moment-range'
import type { EventFormPayload } from './event-form.payload'
import type { StageId } from './event-form.stages'

export function useEventSubmit<Values extends FieldValues>({
  range,
  fieldNames,
  build,
  setError,
  onSubmit,
  onProblem,
  onServerFields,
}: {
  range: MomentRange
  fieldNames: readonly Path<Values>[]
  build: (values: Values, range: MomentRange) => EventFormPayload | null
  setError: UseFormSetError<Values>
  onSubmit: (payload: EventFormPayload) => Promise<void>
  onProblem?: (stage: StageId) => void
  onServerFields?: (named: string[]) => void
}) {
  const [rangeError, setRangeError] = useState<RangeProblem | null>(null)

  async function submit(values: Values) {
    const local = rangeProblem(range)
    if (local !== null) {
      setRangeError(local)
      onProblem?.('period')
      return
    }
    const payload = build(values, range)
    if (payload === null) {
      setRangeError({ start: 'event:form.momentRequired' })
      onProblem?.('period')
      return
    }
    setRangeError(null)
    try {
      await onSubmit(payload)
    } catch (error) {
      const fromServer = serverRangeProblem(error)
      if (fromServer !== null) {
        setRangeError(fromServer)
        onProblem?.('period')
      } else if (isApiError(error)) {
        const named = error.fields.map((field) => field.field ?? '').filter(Boolean)
        if (named.length > 0) onServerFields?.(named)
      }
      applyServerErrors(error, setError, fieldNames)
    }
  }

  return { rangeError, setRangeError, submit }
}
