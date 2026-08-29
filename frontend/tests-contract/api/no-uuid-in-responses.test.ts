import { beforeAll, describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { seed, signInAsMember } from '../support/seed'
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

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

describe('No response body carries a UUID', () => {
  beforeAll(async () => {
    eventId = (await seed()).eventId
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
})
