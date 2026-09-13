import { routes, withPath } from '@tests/support/route-table'
import { describe, expect, it } from 'vitest'

const GUARDED_DEPTH = 2

function depthOf(path: string): number | undefined {
  return withPath(path)[0]?.depth
}

describe('a link from an email opens whether or not someone is already signed in', () => {
  it.each(['/verify-email', '/email-change/confirm', '/email-change/cancel'])(
    'leaves %s outside the anonymous-only guard',
    (path) => {
      expect(depthOf(path)).toBeLessThan(GUARDED_DEPTH)
    },
  )

  it('still keeps the sign-in door itself for guests only', () => {
    expect(depthOf('/login')).toBe(GUARDED_DEPTH)
    expect(depthOf('/register')).toBe(GUARDED_DEPTH)
  })

  it('declares the address confirmation exactly once', () => {
    expect(withPath('/verify-email')).toHaveLength(1)
  })

  it('never sends a visitor away from a confirmation link when their session lapses', () => {
    const confirmations = routes.filter(
      (route) => route.path === '/verify-email' || route.path?.startsWith('/email-change'),
    )
    expect(confirmations.length).toBeGreaterThanOrEqual(3)
    for (const route of confirmations) {
      expect(route.depth).toBeLessThan(GUARDED_DEPTH)
    }
  })
})
