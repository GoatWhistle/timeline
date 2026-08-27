import type { MeResponse } from '@/shared/api/types.gen'
import { users } from './user'

type MockState = {
  currentUserId: string | null
  csrfToken: string
}

export const state: MockState = {
  currentUserId: null,
  csrfToken: 'mock-csrf-token',
}

export function findUserByEmail(email: string): MeResponse | undefined {
  const normalized = email.trim().toLowerCase()
  return users.find((item) => item.email.toLowerCase() === normalized)
}

export function currentUser(): MeResponse | undefined {
  return users.find((item) => item.id === state.currentUserId)
}

export function resetMockState(): void {
  state.currentUserId = null
}

export function nextId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
