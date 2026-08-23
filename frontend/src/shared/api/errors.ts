import type { ErrorBody, FieldError } from './types.gen'

/**
 * Единая ошибка API. Соответствует схеме из docs/api-conventions.md:
 * { error: { code, message, fields[], request_id } }.
 */
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

  /** Ошибка валидации, которую нужно разложить по полям формы. */
  get isValidation(): boolean {
    return this.status === 400 && this.fields.length > 0
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

function defaultCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'validation_failed',
    401: 'unauthenticated',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    429: 'rate_limited',
    503: 'unavailable',
  }
  return codes[status] ?? 'internal_error'
}

function defaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Некорректные данные запроса',
    401: 'Требуется вход в систему',
    403: 'Недостаточно прав',
    404: 'Объект не найден',
    409: 'Операция конфликтует с текущим состоянием',
    429: 'Слишком много запросов, повторите позже',
    503: 'Сервис временно недоступен',
  }
  return messages[status] ?? 'Внутренняя ошибка сервера'
}

/** Приводит тело ответа к ApiError независимо от того, соблюдена ли схема. */
export function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const body = (payload as { error?: Partial<ErrorBody> }).error
    if (body && typeof body === 'object') return new ApiError(status, body)
  }
  return new ApiError(status)
}
