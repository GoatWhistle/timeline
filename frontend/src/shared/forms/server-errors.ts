import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'
import { i18n } from '@/shared/i18n/config'

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
      setError(name, { message: field.message ?? i18n.t('validation.invalidValue') })
      matched = true
    }
  }

  if (!matched) setError('root' as Path<T>, { message: error.message })
}
