import type { UserSummary } from '@/shared/api/types.gen'
import { users } from './fixtures'

export const summary = (id: string): UserSummary | undefined => {
  const found = users.find((item) => item.id === id)
  if (!found) return undefined
  return {
    id: found.id,
    display_name: found.display_name,
    email: found.email,
    is_active: found.is_active,
  }
}
