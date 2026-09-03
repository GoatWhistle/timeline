import { errorMessage } from '../i18n/error-message'
import { isApiError } from './errors'

export type FailureKind = 'offline' | 'network' | 'timeout' | 'server' | 'api'

const OFFLINE = 'transport_offline'
const NETWORK = 'transport_network'
const TIMEOUT = 'transport_timeout'

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isAbort(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError' || error.name === 'TimeoutError'
  }
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

export function failureCode(error: unknown): string {
  if (isApiError(error)) return error.code
  if (isAbort(error)) return TIMEOUT
  if (isOffline()) return OFFLINE
  return NETWORK
}

export function failureKind(error: unknown): FailureKind {
  if (isApiError(error)) return error.status >= 500 ? 'server' : 'api'
  if (isAbort(error)) return 'timeout'
  if (isOffline()) return 'offline'
  return 'network'
}

export function failureMessage(error: unknown): string {
  const code = failureCode(error)
  return errorMessage(code) ?? errorMessage('internal_error') ?? code
}

export function isRetryable(error: unknown): boolean {
  const kind = failureKind(error)
  if (kind === 'api') return isApiError(error) && error.status === 429
  return true
}

export function requestIdOf(error: unknown): string | undefined {
  return isApiError(error) ? error.requestId : undefined
}
