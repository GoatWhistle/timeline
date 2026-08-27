import { assertMatchesContract } from '@tests/support/contract'
import { describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { ARCHIVED_ID, EVENT_ID, loginAs, REGISTRATION_ID } from './contract-support'

describe('Contract compliance: user flow', () => {
  it('POST /events/{id}/registration/done', async () => {
    await loginAs('user@example.com')
    const { data, response } = await api.POST('/events/{id}/registration/done', {
      params: { path: { id: EVENT_ID } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/events/{id}/registration/done', 'post', 200, data)
  })

  it('a regular user gets 403 on an admin endpoint', async () => {
    await loginAs('user@example.com')
    const { error, response } = await api.GET('/admin/audit', { params: { query: {} } })
    expect(response.status).toBe(403)
    assertMatchesContract('/admin/audit', 'get', 403, error)
  })

  it('an unassigned event is not disclosed: 404', async () => {
    await loginAs('user@example.com')
    const { error, response } = await api.GET('/events/{id}', {
      params: { path: { id: ARCHIVED_ID } },
    })
    expect(response.status).toBe(404)
    assertMatchesContract('/events/{id}', 'get', 404, error)
  })

  it('a registration exists in the mock dataset', () => {
    expect(REGISTRATION_ID).not.toBe('')
  })
})

describe('Contract harness self-check', () => {
  it('fails when a required field is missing', () => {
    expect(() =>
      assertMatchesContract('/me', 'get', 200, { id: 'x', display_name: 'Test' }),
    ).toThrow(/does not match the contract/)
  })

  it('fails when a field has the wrong type', () => {
    expect(() =>
      assertMatchesContract('/admin/events', 'get', 200, {
        items: [],
        meta: { page: 'first', page_size: 50, total: 0, has_next: false },
      }),
    ).toThrow(/does not match the contract/)
  })

  it('fails when a value is outside the enum', () => {
    expect(() =>
      assertMatchesContract('/admin/events/{id}/registration', 'get', 200, {
        id: 'x',
        event_id: 'y',
        url: 'https://example.com',
        state: 'PAUSED',
        schedule_version: 1,
        activation_version: 1,
        notification_content_version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/does not match the contract/)
  })
})
