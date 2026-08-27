import { assertMatchesContract } from '@tests/support/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { EVENT_ID, loginAs } from './contract-support'

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

  it('GET /me/events', async () => {
    const { data, response } = await api.GET('/me/events', {
      params: { query: { include_archived: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/me/events', 'get', 200, data)
  })

  it('GET /me/timeline', async () => {
    const { data, response } = await api.GET('/me/timeline', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/me/timeline', 'get', 200, data)
  })

  it('GET /events/{id}', async () => {
    const { data, response } = await api.GET('/events/{id}', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/events/{id}', 'get', 200, data)
  })

  it('GET /events/{id}/stages', async () => {
    const { data, response } = await api.GET('/events/{id}/stages', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/events/{id}/stages', 'get', 200, data)
  })

  it('GET /admin/events', async () => {
    const { data, response } = await api.GET('/admin/events', {
      params: { query: { include_archived: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events', 'get', 200, data)
  })

  it('GET /admin/events/{id}', async () => {
    const { data, response } = await api.GET('/admin/events/{id}', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}', 'get', 200, data)
  })

  it('GET /admin/events/{id}/participants', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/participants', {
      params: { path: { id: EVENT_ID }, query: { include_removed: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/participants', 'get', 200, data)
  })

  it('GET /admin/events/{id}/registration', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/registration', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/registration', 'get', 200, data)
  })

  it('GET /admin/events/{id}/registration/rules', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/registration/rules', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/registration/rules', 'get', 200, data)
  })

  it('GET /admin/events/{id}/registration-statuses', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/registration-statuses', {
      params: { path: { id: EVENT_ID }, query: {} },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/registration-statuses', 'get', 200, data)
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
