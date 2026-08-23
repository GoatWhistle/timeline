import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { users } from '@/mocks/db'
import { server } from '@/mocks/server'
import { api, resetCsrfToken, setUnauthenticatedHandler, unwrap } from './client'
import { isApiError } from './errors'

const unauthorized = () =>
  HttpResponse.json(
    { error: { code: 'unauthenticated', message: 'Требуется вход в систему' } },
    { status: 401 },
  )

describe('Клиент API', () => {
  beforeEach(() => {
    resetCsrfToken()
    setUnauthenticatedHandler(() => {})
  })

  it('прикладывает CSRF-токен к изменяющим запросам', async () => {
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

  it('не запрашивает CSRF-токен для чтения', async () => {
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

  it('обновляет сессию один раз на несколько параллельных 401 и повторяет запросы', async () => {
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

    // Refresh-токен ротируется, поэтому параллельные 401 обязаны схлопнуться в один запрос.
    expect(refreshCalls).toBe(1)
    expect(results.map((user) => user.email)).toEqual([
      users[0]?.email,
      users[0]?.email,
      users[0]?.email,
    ])
  })

  it('сообщает о потере сессии, когда обновление не удалось', async () => {
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

  it('не пытается обновить сессию на ответе входа', async () => {
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

  it('разворачивает ошибку в ApiError со схемой контракта', async () => {
    server.use(
      http.get('*/api/v1/admin/audit', () =>
        HttpResponse.json(
          {
            error: {
              code: 'forbidden',
              message: 'Недостаточно прав',
              request_id: 'req-1',
            },
          },
          { status: 403 },
        ),
      ),
    )

    try {
      await unwrap(api.GET('/admin/audit'))
      expect.unreachable('запрос обязан завершиться ошибкой')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      if (!isApiError(error)) return
      expect(error.status).toBe(403)
      expect(error.code).toBe('forbidden')
      expect(error.requestId).toBe('req-1')
      expect(error.message).toBe('Недостаточно прав')
    }
  })
})
