import type { MeResponse } from '@/shared/api/types.gen'
import { currentUser } from './db'
import { forbidden, unauthenticated } from './http'

type Guarded = { user: MeResponse; deny?: never } | { user?: never; deny: Response }

/** Требует активной сессии. */
export function requireUser(): Guarded {
  const user = currentUser()
  if (!user) return { deny: unauthenticated() }
  return { user }
}

/** Требует прав администратора: 403, потому что объект существует (раздел «403 против 404»). */
export function requireAdmin(): Guarded {
  const user = currentUser()
  if (!user) return { deny: unauthenticated() }
  if (!user.is_admin) return { deny: forbidden() }
  return { user }
}
