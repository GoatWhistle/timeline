import { useState } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { endBeforeStart, type MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { type EventFormPayload, momentServerError } from './event-form.payload'

export function useEventSubmit<Values extends FieldValues>({
  range,
  fieldNames,
  build,
  setError,
  onSubmit,
}: {
  range: MomentRange
  fieldNames: readonly Path<Values>[]
  build: (values: Values, range: MomentRange) => EventFormPayload | null
  setError: UseFormSetError<Values>
  onSubmit: (payload: EventFormPayload) => Promise<void>
}) {
  const [rangeError, setRangeError] = useState<string | null>(null)

  async function submit(values: Values) {
    const payload = build(values, range)
    if (payload === null) {
      setRangeError('event:form.momentRequired')
      return
    }
    if (endBeforeStart(range)) {
      setRangeError('event:form.endAfterStart')
      return
    }
    setRangeError(null)
    try {
      await onSubmit(payload)
    } catch (error) {
      const fromServer = momentServerError(error)
      if (fromServer !== null) setRangeError(fromServer)
      applyServerErrors(error, setError, fieldNames)
    }
  }

  return { rangeError, setRangeError, submit }
}
