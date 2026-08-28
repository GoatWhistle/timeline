import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, resetCsrfToken, setUnauthenticatedHandler, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'
import { MEMBER_PASSWORD, seed } from '../support/seed'
import { ADMIN_EMAIL, signIn, signInAsAdmin } from '../support/session'
import { expireAccessToken, resetSession } from '../support/setup'

const BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:55480/api/v1'

describe('API client against the live API', () => {
  beforeEach(() => {
    resetSession()
    resetCsrfToken()
    setUnauthenticatedHandler(() => {})
  })

  it('attaches the CSRF token to mutating requests', async () => {
    await signInAsAdmin()
    const { response } = await api.POST('/auth/logout')
    expect(response.status).toBe(200)
  })

  it('a mutating request without the CSRF header is rejected by the server', async () => {
    await signInAsAdmin()
    const response = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' })
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error?: { code?: string } }
    expect(body.error?.code).toBe('forbidden')
  })

  it('picks up the CSRF token rotated by the server on sign-in', async () => {
    await signInAsAdmin()
    const rotated = document.cookie.match(/csrf_token=([^;]*)/)?.[1]
    expect(rotated).toBeTruthy()

    const { response } = await api.PATCH('/me', { body: { display_name: 'Rotation Check' } })
    expect(response.status).toBe(200)
  })

  it('does not request a CSRF token for reads', async () => {
    await signInAsAdmin()
    resetCsrfToken()

    const calls: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      calls.push(url)
      return realFetch(input, init)
    }) as typeof fetch

    try {
      await unwrap(api.GET('/me'))
    } finally {
      globalThis.fetch = realFetch
    }

    expect(calls.some((url) => url.includes('/auth/csrf'))).toBe(false)
  })

  it('refreshes the session once for several parallel 401s and retries the requests', async () => {
    await signInAsAdmin()

    expireAccessToken()

    const refreshCalls: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url.includes('/auth/refresh')) refreshCalls.push(url)
      return realFetch(input, init)
    }) as typeof fetch

    let results: { email: string }[]
    try {
      results = await Promise.all([
        unwrap(api.GET('/me')),
        unwrap(api.GET('/me')),
        unwrap(api.GET('/me')),
      ])
    } finally {
      globalThis.fetch = realFetch
    }

    expect(refreshCalls).toHaveLength(1)
    expect(results.map((user) => user.email)).toEqual([ADMIN_EMAIL, ADMIN_EMAIL, ADMIN_EMAIL])
  })

  it('reports a lost session when the refresh fails', async () => {
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)
    resetSession()

    await expect(unwrap(api.GET('/me'))).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.status === 401,
    )
    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('does not try to refresh the session on the sign-in response', async () => {
    const refreshCalls: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url.includes('/auth/refresh')) refreshCalls.push(url)
      return realFetch(input, init)
    }) as typeof fetch

    try {
      await expect(
        unwrap(api.POST('/auth/login', { body: { email: ADMIN_EMAIL, password: 'wrong' } })),
      ).rejects.toThrow()
    } finally {
      globalThis.fetch = realFetch
    }

    expect(refreshCalls).toHaveLength(0)
  })

  it('unwraps a real 403 into ApiError carrying the contract envelope', async () => {
    const { memberEmail } = await seed()
    await signIn(memberEmail, MEMBER_PASSWORD)

    try {
      await unwrap(api.GET('/admin/audit', { params: { query: {} } }))
      expect.unreachable('the request must fail')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      if (!isApiError(error)) return
      expect(error.status).toBe(403)
      expect(error.code).toBe('forbidden')
      expect(error.requestId).toBeTruthy()
      expect(error.message).toBeTruthy()
    }
  })

  it('unwraps a real 401 into ApiError', async () => {
    resetSession()
    setUnauthenticatedHandler(() => {})

    try {
      await unwrap(api.GET('/admin/users', { params: { query: {} } }))
      expect.unreachable('the request must fail')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      if (!isApiError(error)) return
      expect(error.status).toBe(401)
    }
  })
})
