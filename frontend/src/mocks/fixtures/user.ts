import type { MeResponse } from '@/shared/api/types.gen'
import { at } from './clock'

export const MOCK_PASSWORD = 'password123'

function user(
  id: string,
  displayName: string,
  email: string,
  overrides: Partial<MeResponse> = {},
): MeResponse {
  return {
    id,
    display_name: displayName,
    email,
    email_verified: true,
    is_active: true,
    is_admin: false,
    telegram_linked: false,
    created_at: at(-200),
    updated_at: at(-10),
    ...overrides,
  }
}

export const users: MeResponse[] = [
  user('2f1b8e9c-0c4a-4a1e-9b6d-2b2f1e5c7a01', 'Anna Administrator', 'admin@example.com', {
    is_admin: true,
    telegram_linked: true,
    telegram_username: 'anna_admin',
    preferred_channel: 'TELEGRAM',
  }),
  user('7c3d5a21-6e8f-4d2b-8a19-5f0c3b7d9e02', 'Ivan Petrov', 'user@example.com', {
    preferred_channel: 'EMAIL',
  }),
  user('9a4e7b13-2c5d-4f8a-b0e1-6d3a8c2f4b03', 'Maria Sokolova', 'maria@example.com', {
    telegram_linked: true,
    telegram_username: 'maria_s',
  }),
  user('c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e04', 'Petr Kuznetsov', 'petr@example.com', {
    email_verified: false,
  }),
  user('d5e6f7a8-9b0c-4d1e-8f2a-3b4c5d6e7f05', 'Olga Novikova', 'olga@example.com', {
    is_active: false,
  }),
]
