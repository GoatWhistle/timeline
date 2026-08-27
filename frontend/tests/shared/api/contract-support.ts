import { expect } from 'vitest'
import { events, MOCK_PASSWORD, participants, registrations } from '@/mocks/fixtures'
import { api, resetCsrfToken } from '@/shared/api/client'

export const EVENT_ID = events[0]?.id ?? ''
export const ARCHIVED_ID = events[4]?.id ?? ''
export const PARTICIPANT_ID = participants[0]?.id ?? ''
export const REGISTRATION_ID = registrations[0]?.id ?? ''

export async function loginAs(email: string) {
  resetCsrfToken()
  const { response } = await api.POST('/auth/login', {
    body: { email, password: MOCK_PASSWORD },
  })
  expect(response.status).toBe(200)
}
