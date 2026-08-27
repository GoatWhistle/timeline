import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): void {
  if (!isApiError(error)) throw error

  let matched = false
  for (const field of error.fields) {
    const name = field.field as Path<T>
    if (field.field && knownFields.includes(name)) {
      setError(name, { message: field.message ?? 'Некорректное значение' })
      matched = true
    }
  }

  if (!matched) setError('root' as Path<T>, { message: error.message })
}
