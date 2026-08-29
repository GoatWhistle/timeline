import createClient, { type Middleware } from 'openapi-fetch'
import { ApiError, toApiError } from './errors'
import type { paths } from './schema'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/csrf']

const CSRF_COOKIE = 'csrf_token'

let csrfToken: string | null = null
let csrfHeader = 'X-CSRF-Token'
let csrfRequest: Promise<void> | null = null
let refreshRequest: Promise<boolean> | null = null

const retryClones = new WeakMap<Request, Request>()

let onUnauthenticated: () => void = () => {}

export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value ? decodeURIComponent(value) : null
}

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

async function currentCsrfToken(): Promise<string | null> {
  const fromCookie = readCsrfCookie()
  if (fromCookie) {
    csrfToken = fromCookie
    return csrfToken
  }
  await ensureCsrfToken()
  return csrfToken
}

async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return
  if (!csrfRequest) {
    csrfRequest = fetchCsrfToken().finally(() => {
      csrfRequest = null
    })
  }
  await csrfRequest
}

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
  fetch: (request) => globalThis.fetch(request),
})

api.use(authMiddleware)

type Result<T> = { data?: T; error?: unknown; response: Response }

export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await promise
  if (error !== undefined || !response.ok) throw toApiError(response.status, error)
  return data as T
}

export { ApiError }
