import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { users } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { api, resetCsrfToken, setUnauthenticatedHandler, unwrap } from '@/shared/api/client'
import { isApiError } from '@/shared/api/errors'

const unauthorized = () =>
  HttpResponse.json(
    { error: { code: 'unauthenticated', message: 'Sign-in is required.' } },
    { status: 401 },
  )

describe('API client', () => {
  beforeEach(() => {
    resetCsrfToken()
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
    document.cookie = 'csrf_token=; Max-Age=0; path=/'
    setUnauthenticatedHandler(() => {})
  })

  it('attaches the CSRF token to mutating requests', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.post('*/api/v1/auth/logout', ({ request }) => {
        seen.push(request.headers.get('X-CSRF-Token'))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await api.POST('/auth/logout')

    expect(seen).toEqual(['mock-csrf-token'])
  })

  it('reads the CSRF token from the cookie after rotation on sign-in', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.post('*/api/v1/auth/logout', ({ request }) => {
        seen.push(request.headers.get('X-CSRF-Token'))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
    document.cookie = 'csrf_token=rotated-token; path=/'

    await api.POST('/auth/logout')

    expect(seen).toEqual(['rotated-token'])
  })

  it('does not request a CSRF token for reads', async () => {
    let csrfCalls = 0
    server.use(
      http.get('*/api/v1/auth/csrf', () => {
        csrfCalls += 1
        return HttpResponse.json({ csrf_token: 'mock-csrf-token', header_name: 'X-CSRF-Token' })
      }),
      http.get('*/api/v1/me', () => HttpResponse.json(users[0])),
    )

    await unwrap(api.GET('/me'))

    expect(csrfCalls).toBe(0)
  })

  it('refreshes the session once for several parallel 401s and retries the requests', async () => {
    let refreshCalls = 0
    let sessionValid = false

    server.use(
      http.get('*/api/v1/me', () => (sessionValid ? HttpResponse.json(users[0]) : unauthorized())),
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1
        sessionValid = true
        return HttpResponse.json({ user: users[0] })
      }),
    )

    const results = await Promise.all([
      unwrap(api.GET('/me')),
      unwrap(api.GET('/me')),
      unwrap(api.GET('/me')),
    ])

    expect(refreshCalls).toBe(1)
    expect(results.map((user) => user.email)).toEqual([
      users[0]?.email,
      users[0]?.email,
      users[0]?.email,
    ])
  })

  it('reports a lost session when the refresh fails', async () => {
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)

    server.use(
      http.get('*/api/v1/me', () => unauthorized()),
      http.post('*/api/v1/auth/refresh', () => unauthorized()),
    )

    await expect(unwrap(api.GET('/me'))).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.status === 401,
    )
    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('does not try to refresh the session on the sign-in response', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/api/v1/auth/login', () => unauthorized()),
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    await expect(
      unwrap(api.POST('/auth/login', { body: { email: 'a@b.c', password: 'x' } })),
    ).rejects.toThrow()
    expect(refreshCalls).toBe(0)
  })

  it('unwraps an error into ApiError matching the contract schema', async () => {
    server.use(
      http.get('*/api/v1/admin/audit', () =>
        HttpResponse.json(
          {
            error: {
              code: 'forbidden',
              message: 'You do not have enough permissions.',
              request_id: 'req-1',
            },
          },
          { status: 403 },
        ),
      ),
    )

    try {
      await unwrap(api.GET('/admin/audit'))
      expect.unreachable('the request must fail')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      if (!isApiError(error)) return
      expect(error.status).toBe(403)
      expect(error.code).toBe('forbidden')
      expect(error.requestId).toBe('req-1')
      expect(error.message).toBe('You do not have enough permissions.')
    }
  })
})
