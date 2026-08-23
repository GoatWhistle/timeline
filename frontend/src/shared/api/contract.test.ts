import { beforeEach, describe, expect, it } from 'vitest'
import { hackathons, MOCK_PASSWORD, participants, registrations } from '@/mocks/db'
import { assertMatchesContract } from '@/test/contract'
import { api, resetCsrfToken } from './client'

/**
 * Сквозная проверка соответствия контракту.
 *
 * Типы фронтенда сгенерированы из docs/swagger.json, поэтому ошибки в коде
 * ловит tsc. Здесь проверяется то, что tsc увидеть не может: фактические тела
 * ответов. Пока backend не готов, их отдают моки — и именно против них
 * разрабатываются экраны, так что расхождение со схемой обязано падать здесь.
 */

const HACKATHON_ID = hackathons[0]?.id ?? ''
const ARCHIVED_ID = hackathons[4]?.id ?? ''
const PARTICIPANT_ID = participants[0]?.id ?? ''
const REGISTRATION_ID = registrations[0]?.id ?? ''

async function loginAs(email: string) {
  resetCsrfToken()
  const { response } = await api.POST('/auth/login', {
    body: { email, password: MOCK_PASSWORD },
  })
  expect(response.status).toBe(200)
}

describe('Соответствие ответов контракту: чтение', () => {
  beforeEach(async () => {
    await loginAs('admin@example.com')
  })

  it('GET /auth/csrf', async () => {
    const { data, response } = await api.GET('/auth/csrf')
    assertMatchesContract('/auth/csrf', 'get', response.status, data)
  })

  it('GET /me', async () => {
    const { data, response } = await api.GET('/me')
    expect(response.status).toBe(200)
    assertMatchesContract('/me', 'get', 200, data)
  })

  it('GET /me/hackathons', async () => {
    const { data, response } = await api.GET('/me/hackathons', {
      params: { query: { include_archived: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/me/hackathons', 'get', 200, data)
  })

  it('GET /me/timeline', async () => {
    const { data, response } = await api.GET('/me/timeline', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/me/timeline', 'get', 200, data)
  })

  it('GET /hackathons/{id}', async () => {
    const { data, response } = await api.GET('/hackathons/{id}', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/hackathons/{id}', 'get', 200, data)
  })

  it('GET /hackathons/{id}/stages', async () => {
    const { data, response } = await api.GET('/hackathons/{id}/stages', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/hackathons/{id}/stages', 'get', 200, data)
  })

  it('GET /admin/hackathons', async () => {
    const { data, response } = await api.GET('/admin/hackathons', {
      params: { query: { include_archived: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons', 'get', 200, data)
  })

  it('GET /admin/hackathons/{id}', async () => {
    const { data, response } = await api.GET('/admin/hackathons/{id}', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}', 'get', 200, data)
  })

  it('GET /admin/hackathons/{id}/participants', async () => {
    const { data, response } = await api.GET('/admin/hackathons/{id}/participants', {
      params: { path: { id: HACKATHON_ID }, query: { include_removed: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}/participants', 'get', 200, data)
  })

  it('GET /admin/hackathons/{id}/registration', async () => {
    const { data, response } = await api.GET('/admin/hackathons/{id}/registration', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}/registration', 'get', 200, data)
  })

  it('GET /admin/hackathons/{id}/registration/rules', async () => {
    const { data, response } = await api.GET('/admin/hackathons/{id}/registration/rules', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}/registration/rules', 'get', 200, data)
  })

  it('GET /admin/hackathons/{id}/registration-statuses', async () => {
    const { data, response } = await api.GET('/admin/hackathons/{id}/registration-statuses', {
      params: { path: { id: HACKATHON_ID }, query: {} },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}/registration-statuses', 'get', 200, data)
  })

  it('GET /admin/timeline', async () => {
    const { data, response } = await api.GET('/admin/timeline', {
      params: { query: { include_archived: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/timeline', 'get', 200, data)
  })

  it('GET /admin/users', async () => {
    const { data, response } = await api.GET('/admin/users', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/users', 'get', 200, data)
  })

  it('GET /admin/invites', async () => {
    const { data, response } = await api.GET('/admin/invites', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/invites', 'get', 200, data)
  })

  it('GET /admin/audit', async () => {
    const { data, response } = await api.GET('/admin/audit', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/audit', 'get', 200, data)
  })

  it('GET /admin/queries/upcoming', async () => {
    const { data, response } = await api.GET('/admin/queries/upcoming', {
      params: { query: { within_hours: 24 * 30 } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/queries/upcoming', 'get', 200, data)
  })

  it('GET /admin/queries/overdue', async () => {
    const { data, response } = await api.GET('/admin/queries/overdue', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/queries/overdue', 'get', 200, data)
  })

  it('GET /ops/worker-heartbeat', async () => {
    const { data, response } = await api.GET('/ops/worker-heartbeat')
    expect(response.status).toBe(200)
    assertMatchesContract('/ops/worker-heartbeat', 'get', 200, data)
  })

  it('GET /healthz и /readyz', async () => {
    const health = await api.GET('/healthz')
    assertMatchesContract('/healthz', 'get', 200, health.data)
    const ready = await api.GET('/readyz')
    assertMatchesContract('/readyz', 'get', 200, ready.data)
  })
})

describe('Соответствие ответов контракту: изменения', () => {
  beforeEach(async () => {
    await loginAs('admin@example.com')
  })

  it('POST /auth/login → 200', async () => {
    const { data, response } = await api.POST('/auth/login', {
      body: { email: 'admin@example.com', password: MOCK_PASSWORD },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/auth/login', 'post', 200, data)
  })

  it('POST /auth/login → 401', async () => {
    const { error, response } = await api.POST('/auth/login', {
      body: { email: 'admin@example.com', password: 'неверный' },
    })
    expect(response.status).toBe(401)
    assertMatchesContract('/auth/login', 'post', 401, error)
  })

  it('POST /auth/refresh', async () => {
    const { data, response } = await api.POST('/auth/refresh')
    expect(response.status).toBe(200)
    assertMatchesContract('/auth/refresh', 'post', 200, data)
  })

  it('PATCH /me', async () => {
    const { data, response } = await api.PATCH('/me', {
      body: { display_name: 'Анна Администратор' },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/me', 'patch', 200, data)
  })

  it('POST /me/telegram/link', async () => {
    const { data, response } = await api.POST('/me/telegram/link')
    expect(response.status).toBe(200)
    assertMatchesContract('/me/telegram/link', 'post', 200, data)
  })

  it('POST /admin/hackathons → 201', async () => {
    const { data, response } = await api.POST('/admin/hackathons', {
      body: {
        title: 'Тестовый хакатон контракта',
        start_at: new Date(Date.now() + 86_400_000).toISOString(),
        end_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/hackathons', 'post', 201, data)
  })

  it('POST /admin/hackathons/{id}/participants/batch-add', async () => {
    const { data, response } = await api.POST('/admin/hackathons/{id}/participants/batch-add', {
      params: { path: { id: HACKATHON_ID } },
      body: { items: [{ user_id: participants[0]?.user.id ?? '', team_role: 'Разработчик' }] },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/hackathons/{id}/participants/batch-add', 'post', 200, data)
  })

  it('POST /admin/hackathons/{id}/registration-statuses/batch-set/preview', async () => {
    const { data, response } = await api.POST(
      '/admin/hackathons/{id}/registration-statuses/batch-set/preview',
      {
        params: { path: { id: HACKATHON_ID } },
        body: { participant_ids: [PARTICIPANT_ID], status: 'NOT_REQUIRED' },
      },
    )
    expect(response.status).toBe(200)
    assertMatchesContract(
      '/admin/hackathons/{id}/registration-statuses/batch-set/preview',
      'post',
      200,
      data,
    )
  })

  it('PATCH /admin/participants/{id}/team-role', async () => {
    const { data, response } = await api.PATCH('/admin/participants/{id}/team-role', {
      params: { path: { id: PARTICIPANT_ID } },
      body: { team_role: 'Тимлид' },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/participants/{id}/team-role', 'patch', 200, data)
  })

  it('POST /admin/hackathons/{id}/stages → 201', async () => {
    const { data, response } = await api.POST('/admin/hackathons/{id}/stages', {
      params: { path: { id: HACKATHON_ID } },
      body: {
        name: 'Проверочный этап',
        type: 'CHECKPOINT',
        start_at: new Date(Date.now() + 86_400_000).toISOString(),
        end_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        sort_order: 9,
      },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/hackathons/{id}/stages', 'post', 201, data)
  })

  it('POST /admin/hackathons/{id}/registration/rules → 201', async () => {
    const { data, response } = await api.POST('/admin/hackathons/{id}/registration/rules', {
      params: { path: { id: HACKATHON_ID } },
      body: { offset_minutes: 777, enabled: true },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/hackathons/{id}/registration/rules', 'post', 201, data)
  })

  it('POST /admin/invites → 201', async () => {
    const { data, response } = await api.POST('/admin/invites', {
      body: { email: `contract-${Date.now()}@example.com` },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/invites', 'post', 201, data)
  })

  it('POST /admin/users/{id}/deactivate', async () => {
    const target = participants[1]?.user.id ?? ''
    const { data, response } = await api.POST('/admin/users/{id}/deactivate', {
      params: { path: { id: target } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/users/{id}/deactivate', 'post', 200, data)
    await api.POST('/admin/users/{id}/activate', { params: { path: { id: target } } })
  })

  it('POST /auth/logout', async () => {
    const { data, response } = await api.POST('/auth/logout')
    expect(response.status).toBe(200)
    assertMatchesContract('/auth/logout', 'post', 200, data)
  })
})

describe('Соответствие ответов контракту: пользовательский поток', () => {
  it('POST /hackathons/{id}/registration/done', async () => {
    await loginAs('user@example.com')
    const { data, response } = await api.POST('/hackathons/{id}/registration/done', {
      params: { path: { id: HACKATHON_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/hackathons/{id}/registration/done', 'post', 200, data)
  })

  it('обычный пользователь получает 403 на административном endpoint', async () => {
    await loginAs('user@example.com')
    const { error, response } = await api.GET('/admin/audit', { params: { query: {} } })
    expect(response.status).toBe(403)
    assertMatchesContract('/admin/audit', 'get', 403, error)
  })

  it('неназначенный хакатон не раскрывается: 404', async () => {
    await loginAs('user@example.com')
    const { error, response } = await api.GET('/hackathons/{id}', {
      params: { path: { id: ARCHIVED_ID } },
    })
    expect(response.status).toBe(404)
    assertMatchesContract('/hackathons/{id}', 'get', 404, error)
  })

  it('регистрация существует в наборе моков', () => {
    expect(REGISTRATION_ID).not.toBe('')
  })
})

describe('Самопроверка контрактного харнесса', () => {
  it('падает, если обязательное поле отсутствует', () => {
    expect(() =>
      assertMatchesContract('/me', 'get', 200, { id: 'x', display_name: 'Тест' }),
    ).toThrow(/не соответствует контракту/)
  })

  it('падает, если тип поля не тот', () => {
    expect(() =>
      assertMatchesContract('/admin/hackathons', 'get', 200, {
        items: [],
        meta: { page: 'первая', page_size: 50, total: 0, has_next: false },
      }),
    ).toThrow(/не соответствует контракту/)
  })

  it('падает, если значение вне перечисления', () => {
    expect(() =>
      assertMatchesContract('/admin/hackathons/{id}/registration', 'get', 200, {
        id: 'x',
        hackathon_id: 'y',
        url: 'https://example.com',
        state: 'PAUSED',
        schedule_version: 1,
        activation_version: 1,
        notification_content_version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/не соответствует контракту/)
  })
})
