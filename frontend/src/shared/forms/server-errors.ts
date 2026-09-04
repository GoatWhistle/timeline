import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'
import { failureMessage } from '@/shared/api/failure'
import { fieldMessage } from './field-message'

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): void {
  if (!isApiError(error)) {
    setError('root' as Path<T>, { message: failureMessage(error) })
    return
  }

  const unplaced: string[] = []
  let matched = false
  for (const field of error.fields) {
    if (!field.field) continue
    const name = field.field as Path<T>
    if (knownFields.includes(name)) {
      setError(name, { message: fieldMessage(field) })
      matched = true
    } else {
      unplaced.push(fieldMessage(field))
    }
  }

  if (unplaced.length > 0) {
    setError('root' as Path<T>, { message: unplaced.join(' ') })
    return
  }
  if (!matched) setError('root' as Path<T>, { message: failureMessage(error) })
}
