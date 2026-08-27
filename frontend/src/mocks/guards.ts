import type { MeResponse } from '@/shared/api/types.gen'
import { currentUser } from './fixtures'
import { forbidden, unauthenticated } from './http'

type Guarded = { user: MeResponse; deny?: never } | { user?: never; deny: Response }

export function requireUser(): Guarded {
  const user = currentUser()
  if (!user) return { deny: unauthenticated() }
  return { user }
}

export function requireAdmin(): Guarded {
  const user = currentUser()
  if (!user) return { deny: unauthenticated() }
  if (!user.is_admin) return { deny: forbidden() }
  return { user }
}
