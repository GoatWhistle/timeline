import { assertMatchesContract } from '@tests/support/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_PASSWORD, participants } from '@/mocks/fixtures'
import { api } from '@/shared/api/client'
import { EVENT_ID, loginAs, PARTICIPANT_ID } from './contract-support'

describe('Contract compliance: writes', () => {
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
      body: { email: 'admin@example.com', password: 'wrong-password' },
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
      body: { display_name: 'Anna Administrator' },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/me', 'patch', 200, data)
  })

  it('POST /me/telegram/link', async () => {
    const { data, response } = await api.POST('/me/telegram/link')
    expect(response.status).toBe(200)
    assertMatchesContract('/me/telegram/link', 'post', 200, data)
  })

  it('POST /admin/events → 201', async () => {
    const { data, response } = await api.POST('/admin/events', {
      body: {
        title: 'Contract test event',
        start_at: new Date(Date.now() + 86_400_000).toISOString(),
        end_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/events', 'post', 201, data)
  })

  it('POST /admin/events/{id}/participants/batch-add', async () => {
    const { data, response } = await api.POST('/admin/events/{id}/participants/batch-add', {
      params: { path: { id: EVENT_ID } },
      body: { items: [{ user_id: participants[0]?.user.id ?? '', team_role: 'Developer' }] },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/events/{id}/participants/batch-add', 'post', 200, data)
  })

  it('POST /admin/events/{id}/registration-statuses/batch-set/preview', async () => {
    const { data, response } = await api.POST(
      '/admin/events/{id}/registration-statuses/batch-set/preview',
      {
        params: { path: { id: EVENT_ID } },
        body: { participant_ids: [PARTICIPANT_ID], status: 'NOT_REQUIRED' },
      },
    )
    expect(response.status).toBe(200)
    assertMatchesContract(
      '/admin/events/{id}/registration-statuses/batch-set/preview',
      'post',
      200,
      data,
    )
  })

  it('PATCH /admin/participants/{id}/team-role', async () => {
    const { data, response } = await api.PATCH('/admin/participants/{id}/team-role', {
      params: { path: { id: PARTICIPANT_ID } },
      body: { team_role: 'Team Lead' },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/participants/{id}/team-role', 'patch', 200, data)
  })

  it('POST /admin/events/{id}/stages → 201', async () => {
    const { data, response } = await api.POST('/admin/events/{id}/stages', {
      params: { path: { id: EVENT_ID } },
      body: {
        name: 'Verification stage',
        type: 'CHECKPOINT',
        start_at: new Date(Date.now() + 86_400_000).toISOString(),
        end_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        sort_order: 9,
      },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/events/{id}/stages', 'post', 201, data)
  })

  it('POST /admin/events/{id}/registration/rules → 201', async () => {
    const { data, response } = await api.POST('/admin/events/{id}/registration/rules', {
      params: { path: { id: EVENT_ID } },
      body: { offset_minutes: 777, enabled: true },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/events/{id}/registration/rules', 'post', 201, data)
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
