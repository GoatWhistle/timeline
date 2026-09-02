import { ApiError, isApiError } from '@/shared/api/errors'

export const ABSENT = 'absent'
export const UNREADABLE = 'unreadable'

export type Presence = typeof ABSENT | typeof UNREADABLE

export function isAbsence(error: unknown): boolean {
  return isApiError(error) && error.status === 404
}

export function presentAbsence(error: unknown): Presence {
  return isAbsence(error) ? ABSENT : UNREADABLE
}

export function asAbsence<T>(error: unknown, empty: T): T {
  if (isAbsence(error)) return empty
  throw error
}

export function personalError(error: unknown): ApiError {
  if (!isApiError(error)) return new ApiError(503)
  if (error.status === 403) return new ApiError(404, { code: 'not_found' })
  return error
}
