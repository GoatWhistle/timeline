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

const CSRF_COOKIE = 'csrf_token'

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

/**
 * Значение CSRF-cookie. Cookie намеренно доступна JavaScript: схема double
 * submit требует вернуть её значение заголовком. Backend выдаёт новый токен
 * при входе и обновлении сессии, поэтому cookie — источник истины, а кэш в
 * памяти после ротации устаревает.
 */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value ? decodeURIComponent(value) : null
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

/**
 * Токен для очередного изменяющего запроса: сначала актуальная cookie, затем
 * запрос к /auth/csrf, если её нет.
 */
async function currentCsrfToken(): Promise<string | null> {
  const fromCookie = readCsrfCookie()
  if (fromCookie) {
    csrfToken = fromCookie
    return csrfToken
  }
  await ensureCsrfToken()
  return csrfToken
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
      const token = await currentCsrfToken()
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: token ? { [csrfHeader]: token } : {},
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
      const token = await currentCsrfToken()
      if (token) request.headers.set(csrfHeader, token)
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
    // Обновление сессии выдало новый CSRF-токен: заголовок берётся заново.
    if (MUTATING.has(retry.method)) {
      const token = await currentCsrfToken()
      if (token) retry.headers.set(csrfHeader, token)
    }
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
