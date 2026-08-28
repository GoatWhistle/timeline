import { expect } from 'vitest'
import { api, resetCsrfToken } from '@/shared/api/client'
import { resetSession } from './setup'

export const ADMIN_EMAIL = process.env.CONTRACT_ADMIN_EMAIL ?? 'contract-admin@example.com'
export const ADMIN_PASSWORD = process.env.CONTRACT_ADMIN_PASSWORD ?? 'contract-password-123'

export async function signIn(email: string, password: string): Promise<void> {
  resetSession()
  resetCsrfToken()
  const { response } = await api.POST('/auth/login', { body: { email, password } })
  expect(response.status).toBe(200)
}

export function signInAsAdmin(): Promise<void> {
  return signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
}

export async function signOut(): Promise<void> {
  await api.POST('/auth/logout')
  resetSession()
  resetCsrfToken()
}
