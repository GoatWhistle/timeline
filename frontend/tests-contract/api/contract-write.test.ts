import { assertMatchesContract } from '@tests/support/contract'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/shared/api/client'
import { seed } from '../support/seed'
import { ADMIN_EMAIL, ADMIN_PASSWORD, signInAsAdmin } from '../support/session'

let eventId = ''
let participantId = ''
let spareUserId = ''

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

describe('Contract compliance: writes', () => {
  beforeAll(async () => {
    const seeded = await seed()
    eventId = seeded.eventId
    participantId = seeded.participantId
    spareUserId = seeded.spareUserId
  })

  beforeEach(async () => {
    await signInAsAdmin()
  })

  it('POST /auth/login → 200', async () => {
    const { data, response } = await api.POST('/auth/login', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/auth/login', 'post', 200, data)
  })

  it('POST /auth/login → 401', async () => {
    const { error, response } = await api.POST('/auth/login', {
      body: { email: ADMIN_EMAIL, password: 'wrong-password' },
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
      body: { first_name: 'Contract', last_name: 'Administrator' },
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
      body: { title: 'Contract test event', start_at: inThe(1), end_at: inThe(2) },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/events', 'post', 201, data)
  })

  it('POST /admin/events/{id}/registration-statuses/batch-set/preview', async () => {
    const { data, response } = await api.POST(
      '/admin/events/{id}/registration-statuses/batch-set/preview',
      {
        params: { path: { id: eventId } },
        body: { participant_ids: [participantId], status: 'NOT_REQUIRED' },
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
      params: { path: { id: participantId } },
      body: { team_role: 'Team Lead' },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/participants/{id}/team-role', 'patch', 200, data)
  })

  it('POST /admin/events/{id}/stages → 201', async () => {
    const { data, response } = await api.POST('/admin/events/{id}/stages', {
      params: { path: { id: eventId } },
      body: {
        name: 'Verification stage',
        type: 'CHECKPOINT',
        start_at: inThe(1),
        end_at: inThe(2),
        sort_order: 9,
      },
    })
    expect(response.status).toBe(201)
    assertMatchesContract('/admin/events/{id}/stages', 'post', 201, data)
  })

  it('POST /admin/users/{id}/deactivate', async () => {
    const { data, response } = await api.POST('/admin/users/{id}/deactivate', {
      params: { path: { id: spareUserId } },
    })
    expect(response.status).toBe(200)
    assertMatchesContract('/admin/users/{id}/deactivate', 'post', 200, data)
    await api.POST('/admin/users/{id}/activate', { params: { path: { id: spareUserId } } })
  })

  it('POST /auth/logout', async () => {
    const { data, response } = await api.POST('/auth/logout')
    expect(response.status).toBe(200)
    assertMatchesContract('/auth/logout', 'post', 200, data)
  })
})
