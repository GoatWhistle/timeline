import createClient, { type Middleware } from 'openapi-fetch'
import { ApiError, toApiError } from './errors'
import type { paths } from './schema'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Пути, для которых 401 — законный ответ, а не признак истёкшего access token.
 * Прозрачное обновление сессии для них не выполняется.
 */
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/csrf']

let csrfToken: string | null = null
let csrfHeader = 'X-CSRF-Token'
let csrfRequest: Promise<void> | null = null
let refreshRequest: Promise<boolean> | null = null

/** Копии запросов, сохранённые до отправки, чтобы повторить их после refresh. */
const retryClones = new WeakMap<Request, Request>()

let onUnauthenticated: () => void = () => {}

/**
 * Вызывается роутером. Клиент не импортирует навигацию сам, чтобы модуль api
 * оставался независимым от React и маршрутов.
 */
export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler
}

/** Сбрасывает кэш CSRF: нужен после logout и в тестах. */
export function resetCsrfToken(): void {
  csrfToken = null
  csrfRequest = null
}

async function fetchCsrfToken(): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return
  const body = (await response.json()) as { csrf_token?: string; header_name?: string }
  if (body.csrf_token) csrfToken = body.csrf_token
  if (body.header_name) csrfHeader = body.header_name
}

/** Гарантирует наличие CSRF-токена, схлопывая параллельные запросы в один. */
async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return
  if (!csrfRequest) {
    csrfRequest = fetchCsrfToken().finally(() => {
      csrfRequest = null
    })
  }
  await csrfRequest
}

/**
 * Однократное прозрачное обновление сессии. Параллельные 401 ждут один и тот же
 * запрос, поэтому refresh-token ротируется ровно один раз.
 */
function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      await ensureCsrfToken()
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: csrfToken ? { [csrfHeader]: csrfToken } : {},
        })
        return response.ok
      } catch {
        return false
      }
    })().finally(() => {
      refreshRequest = null
    })
  }
  return refreshRequest
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (MUTATING.has(request.method)) {
      await ensureCsrfToken()
      if (csrfToken) request.headers.set(csrfHeader, csrfToken)
    }
    // Копия снимается до отправки: тело уже отправленного запроса недоступно.
    retryClones.set(request, request.clone())
    return request
  },

  async onResponse({ request, response, schemaPath }) {
    if (response.status !== 401) return response
    if (NO_REFRESH.includes(schemaPath)) return response

    const retry = retryClones.get(request)
    if (!retry) return response

    if (!(await refreshSession())) {
      onUnauthenticated()
      return response
    }

    // Повтор идёт мимо middleware, поэтому цикл повторов невозможен.
    if (MUTATING.has(retry.method) && csrfToken) retry.headers.set(csrfHeader, csrfToken)
    return fetch(retry)
  },
}

export const api = createClient<paths>({
  baseUrl: BASE_URL,
  credentials: 'include',
  headers: { Accept: 'application/json' },
  // Позднее связывание fetch обязательно: openapi-fetch запоминает ссылку при
  // создании клиента, а MSW подменяет globalThis.fetch позже, уже в beforeAll.
  fetch: (request) => globalThis.fetch(request),
})

api.use(authMiddleware)

type Result<T> = { data?: T; error?: unknown; response: Response }

/**
 * Разворачивает ответ openapi-fetch: данные возвращаются, ошибка выбрасывается
 * как ApiError. TanStack Query и формы работают с одним типом ошибки.
 */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await promise
  if (error !== undefined || !response.ok) throw toApiError(response.status, error)
  return data as T
}

/** Ответ без тела (204). */
export async function unwrapEmpty(promise: Promise<Result<unknown>>): Promise<void> {
  const { error, response } = await promise
  if (!response.ok) throw toApiError(response.status, error)
}

export { ApiError }
