import { beforeAll, describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { type Seeded, seed, signInAsMember } from '../support/seed'
import { signInAsAdmin } from '../support/session'

const UUID_SHAPE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

type Finding = { path: string; value: string }

function findUuids(value: unknown, path = '$'): Finding[] {
  if (typeof value === 'string') {
    return UUID_SHAPE.test(value) ? [{ path, value }] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findUuids(item, `${path}[${index}]`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nested]) => findUuids(nested, `${path}.${key}`))
  }
  return []
}

function expectNoUuid(label: string, body: unknown): void {
  const findings = findUuids(body)
  if (findings.length === 0) return
  const detail = findings.map((f) => `  ${f.path} = ${f.value}`).join('\n')
  throw new Error(`${label} exposes a UUID in the response body:\n${detail}`)
}

let eventId = ''
let seeded: Seeded

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

describe('No response body carries a UUID', () => {
  beforeAll(async () => {
    seeded = await seed()
    eventId = seeded.eventId
    await signInAsAdmin()
    const stage = await api.POST('/admin/events/{id}/stages', {
      params: { path: { id: eventId } },
      body: { name: 'Leak probe stage', type: 'DEMO', start_at: inThe(1), end_at: inThe(2) },
    })
    expect(stage.response.status).toBe(201)
  })

  it('detects a UUID at any depth', () => {
    const uuid = '3f1c1e6e-0b0e-4a2b-9c1a-7d1f1f5a1c11'
    expect(findUuids({ id: 'ev_gma9hq8a96q5' })).toHaveLength(0)
    expect(findUuids({ a: { b: [{ c: uuid }] } })).toHaveLength(1)
    expect(findUuids({ a: { b: [{ c: uuid }] } })[0]?.path).toBe('$.a.b[0].c')
    expect(findUuids({ note: `see ${uuid} for details` })).toHaveLength(1)
    expect(findUuids([{ x: uuid }, { y: uuid }])).toHaveLength(2)
  })

  it('GET /admin/events', async () => {
    const { data } = await api.GET('/admin/events', {
      params: { query: { include_archived: true } },
    })
    expectNoUuid('GET /admin/events', data)
  })

  it('GET /admin/events/{id}', async () => {
    const { data } = await api.GET('/admin/events/{id}', { params: { path: { id: eventId } } })
    expectNoUuid('GET /admin/events/{id}', data)
  })

  it('GET /events/{id}', async () => {
    await signInAsMember()
    const { data } = await api.GET('/events/{id}', { params: { path: { id: eventId } } })
    expectNoUuid('GET /events/{id}', data)
    await signInAsAdmin()
  })

  it('GET /events/{id}/stages', async () => {
    await signInAsMember()
    const { data } = await api.GET('/events/{id}/stages', { params: { path: { id: eventId } } })
    expect(Array.isArray(data) ? data.length : 0).toBeGreaterThan(0)
    expectNoUuid('GET /events/{id}/stages', data)
    await signInAsAdmin()
  })

  it('GET /me/events', async () => {
    const { data } = await api.GET('/me/events', { params: { query: { include_archived: true } } })
    expectNoUuid('GET /me/events', data)
  })

  it('GET /me/schedule', async () => {
    const { data } = await api.GET('/me/schedule', { params: { query: {} } })
    expectNoUuid('GET /me/schedule', data)
  })

  it('GET /catalog', async () => {
    const { data } = await api.GET('/catalog', { params: { query: {} } })
    expectNoUuid('GET /catalog', data)
  })

  it('GET /me/history', async () => {
    const { data } = await api.GET('/me/history', { params: { query: {} } })
    expectNoUuid('GET /me/history', data)
  })

  it('GET /admin/events/{id}/participants', async () => {
    const { data } = await api.GET('/admin/events/{id}/participants', {
      params: { path: { id: eventId }, query: {} },
    })
    expectNoUuid('GET /admin/events/{id}/participants', data)
  })

  it('GET /admin/events/{id}/registration', async () => {
    const { data } = await api.GET('/admin/events/{id}/registration', {
      params: { path: { id: eventId } },
    })
    expectNoUuid('GET /admin/events/{id}/registration', data)
  })

  it('GET /admin/events/{id}/registration/rules', async () => {
    const { data } = await api.GET('/admin/events/{id}/registration/rules', {
      params: { path: { id: eventId } },
    })
    expectNoUuid('GET /admin/events/{id}/registration/rules', data)
  })

  it('GET /admin/events/{id}/registration-statuses', async () => {
    const { data } = await api.GET('/admin/events/{id}/registration-statuses', {
      params: { path: { id: eventId }, query: {} },
    })
    expectNoUuid('GET /admin/events/{id}/registration-statuses', data)
  })

  it('POST /admin/events/{id}/participants/batch-remove', async () => {
    const { data } = await api.POST('/admin/events/{id}/participants/batch-remove', {
      params: { path: { id: eventId } },
      body: { participant_ids: [seeded.spareParticipantId] },
    })
    expectNoUuid('POST /admin/events/{id}/participants/batch-remove', data)
  })

  it('GET /admin/users', async () => {
    const { data } = await api.GET('/admin/users', { params: { query: {} } })
    expectNoUuid('GET /admin/users', data)
  })

  it('GET /admin/invites', async () => {
    const { data } = await api.GET('/admin/invites', { params: { query: {} } })
    expectNoUuid('GET /admin/invites', data)
  })

  it('GET /me', async () => {
    const { data } = await api.GET('/me')
    expectNoUuid('GET /me', data)
  })

  it('GET /me/sessions', async () => {
    const { data } = await api.GET('/me/sessions')
    expectNoUuid('GET /me/sessions', data)
  })

  it('GET /me/profile-links', async () => {
    const created = await api.POST('/me/profile-links', {
      body: { url: 'https://github.com/leak-probe' },
    })
    expect(created.response.status).toBe(201)
    const { data } = await api.GET('/me/profile-links')
    expectNoUuid('GET /me/profile-links', data)
  })

  it('GET /events/{id}/links', async () => {
    const created = await api.POST('/events/{id}/links', {
      params: { path: { id: eventId } },
      body: { kind: 'RULES', url: 'https://example.org/leak-probe-rules' },
    })
    expect(created.response.status).toBe(201)
    const { data } = await api.GET('/events/{id}/links', { params: { path: { id: eventId } } })
    expectNoUuid('GET /events/{id}/links', data)
  })

  it('GET /me/events/{id}/tasks', async () => {
    await signInAsMember()
    const created = await api.POST('/me/events/{id}/tasks', {
      params: { path: { id: eventId } },
      body: { title: 'Leak probe task' },
    })
    expect(created.response.status).toBe(201)
    const { data } = await api.GET('/me/events/{id}/tasks', { params: { path: { id: eventId } } })
    expectNoUuid('GET /me/events/{id}/tasks', data)
    await signInAsAdmin()
  })

  it('GET /me/events/{id}/artifacts', async () => {
    await signInAsMember()
    const created = await api.POST('/me/events/{id}/artifacts', {
      params: { path: { id: eventId } },
      body: { kind: 'REPOSITORY', url: 'https://github.com/example/leak-probe' },
    })
    expect(created.response.status).toBe(201)
    const { data } = await api.GET('/me/events/{id}/artifacts', {
      params: { path: { id: eventId } },
    })
    expectNoUuid('GET /me/events/{id}/artifacts', data)
    await signInAsAdmin()
  })

  it('GET /me/events-feed', async () => {
    const { data } = await api.GET('/me/events-feed', { params: { query: {} } })
    expectNoUuid('GET /me/events-feed', data)
  })

  it('GET /me/inbox', async () => {
    const { data } = await api.GET('/me/inbox', { params: { query: {} } })
    expectNoUuid('GET /me/inbox', data)
  })
})
