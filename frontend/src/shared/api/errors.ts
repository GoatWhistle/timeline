import { errorMessage } from '../i18n/error-message'
import type { ErrorBody, FieldError } from './types.gen'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: FieldError[]
  readonly requestId: string | undefined

  constructor(status: number, body: Partial<ErrorBody> = {}) {
    super(body.message ?? defaultMessage(status))
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? defaultCode(status)
    this.fields = body.fields ?? []
    this.requestId = body.request_id
  }

  get isValidation(): boolean {
    return this.status === 400 && this.fields.length > 0
  }

  get localizedMessage(): string {
    return errorMessage(this.code) ?? this.message
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

function defaultCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'validation_failed',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    429: 'rate_limited',
    503: 'internal_error',
  }
  return codes[status] ?? 'internal_error'
}

function defaultMessage(status: number): string {
  return errorMessage(defaultCode(status)) ?? 'Internal server error'
}

export function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const body = (payload as { error?: Partial<ErrorBody> }).error
    if (body && typeof body === 'object') return new ApiError(status, body)
  }
  return new ApiError(status)
}
