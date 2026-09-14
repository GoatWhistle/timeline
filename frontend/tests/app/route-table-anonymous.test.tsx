import { routes } from '@tests/support/route-table'
import { describe, expect, it } from 'vitest'
import { staysAnonymous } from '@/app/router'
import { isPublicProfileHandle } from '@/shared/routing/public-profile-path'

const ANONYMOUS = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/email-change',
]

describe('a logged-out visitor is sent to the login form only from the app itself', () => {
  it.each(['/events', '/catalog', '/schedule', '/history', '/settings', '/teams', '/'])(
    'redirects %s, which needs a session',
    (path) => {
      expect(staysAnonymous(path)).toBe(false)
    },
  )

  it.each(['/admin/events', '/admin/users', '/teams/abc', '/events/abc'])(
    'redirects the nested app path %s',
    (path) => {
      expect(staysAnonymous(path)).toBe(false)
    },
  )

  it.each(['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'])(
    'leaves the anonymous page %s alone',
    (path) => {
      expect(staysAnonymous(path)).toBe(true)
    },
  )

  it.each(['/@ivan', '/@administrator', '/@a'])(
    'leaves the public profile %s alone, so it can be read without signing in',
    (path) => {
      expect(staysAnonymous(path)).toBe(true)
    },
  )

  it.each(['/tea', '/nonsense', '/some-old-link', '/tea/pot'])(
    'leaves the unknown path %s alone, so it can show the not-found page',
    (path) => {
      expect(staysAnonymous(path)).toBe(true)
    },
  )

  it('keeps the profile rule and the app rule from overlapping', () => {
    for (const path of ['/events', '/catalog', '/admin/events']) {
      expect(isPublicProfileHandle(path.slice(1))).toBe(false)
      expect(staysAnonymous(path)).toBe(false)
    }
  })
})

describe('the session-required list matches the routes that need a session', () => {
  const guarded = routes
    .map((route) => route.path)
    .filter((path): path is string => path !== undefined && path !== '*' && path.startsWith('/'))
    .filter((path) => !path.startsWith('/:'))
    .filter((path) => !ANONYMOUS.some((p) => path === p || path.startsWith(`${p}/`)))

  it.each(guarded)('sends a logged-out visitor at %s to the login form', (path) => {
    const concrete = path.replace(/:[^/]+/g, 'abc')
    expect(staysAnonymous(concrete)).toBe(false)
  })

  it('found routes to check, so the list is not vacuously satisfied', () => {
    expect(guarded.length).toBeGreaterThan(5)
  })
})

describe('an email-change link works without a session, on either address', () => {
  it.each(['/email-change/confirm', '/email-change/cancel'])('stays reachable at %s', (path) => {
    expect(staysAnonymous(path)).toBe(true)
  })
})
