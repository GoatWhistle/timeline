import { assertMatchesContract } from '@tests/support/contract'
import { beforeAll, describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { seed, signInAsMember } from '../support/seed'
import { signInAsAdmin } from '../support/session'

let eventId = ''

describe('Contract compliance: reads', () => {
  beforeAll(async () => {
    eventId = (await seed()).eventId
    await signInAsAdmin()
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

  it('GET /me/schedule', async () => {
    const { data, response } = await api.GET('/me/schedule', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/me/schedule', 'get', 200, data)
  })

  it('GET /events/{id}', async () => {
    await signInAsMember()
    const { data, response } = await api.GET('/events/{id}', {
      params: { path: { id: eventId } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/events/{id}', 'get', 200, data)
    await signInAsAdmin()
  })

  it('GET /events/{id}/stages', async () => {
    await signInAsMember()
    const { data, response } = await api.GET('/events/{id}/stages', {
      params: { path: { id: eventId } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/events/{id}/stages', 'get', 200, data)
    await signInAsAdmin()
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
      params: { path: { id: eventId } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}', 'get', 200, data)
  })

  it('GET /admin/events/{id}/participants', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/participants', {
      params: { path: { id: eventId }, query: { include_removed: true } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/participants', 'get', 200, data)
  })

  it('GET /admin/events/{id}/registration', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/registration', {
      params: { path: { id: eventId } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/registration', 'get', 200, data)
  })

  it('GET /admin/events/{id}/registration-statuses', async () => {
    const { data, response } = await api.GET('/admin/events/{id}/registration-statuses', {
      params: { path: { id: eventId }, query: {} },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/registration-statuses', 'get', 200, data)
  })

  it('GET /admin/users', async () => {
    const { data, response } = await api.GET('/admin/users', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/users', 'get', 200, data)
  })

  it('GET /admin/audit', async () => {
    const { data, response } = await api.GET('/admin/audit', { params: { query: {} } })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/audit', 'get', 200, data)
  })

  it('GET /healthz and /readyz', async () => {
    const health = await api.GET('/healthz')
    assertMatchesContract('/healthz', 'get', 200, health.data)
    const ready = await api.GET('/readyz')
    assertMatchesContract('/readyz', 'get', 200, ready.data)
  })
})
