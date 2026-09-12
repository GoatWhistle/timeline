import { elementType, navigateTarget, routes, withPath } from '@tests/support/route-table'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from '@/app/auth-layout'
import { NotFoundPage } from '@/app/pages/not-found-page'
import { PublicProfileRoute } from '@/app/public-profile-route'
import { PublicProfileShell } from '@/app/public-profile-shell'

describe('the route table exposes the profile shape guard', () => {
  it('declares the single-segment route exactly once', () => {
    expect(withPath('/:handle')).toHaveLength(1)
  })

  it('mounts the shape guard on it, never the profile page directly', () => {
    const [handleRoute] = withPath('/:handle')
    expect(elementType(handleRoute?.element)).toBe(PublicProfileRoute)
  })

  it('has no other single-segment dynamic route that could swallow a path', () => {
    const swallowing = routes.filter(
      (route) =>
        route.path !== undefined && /^\/:[^/]+$/.test(route.path) && route.path !== '/:handle',
    )
    expect(swallowing).toEqual([])
  })

  it('no longer borrows the sign-in door as its shell', () => {
    const [handleRoute] = withPath('/:handle')
    expect(handleRoute?.layout).not.toBe(AuthLayout)
    expect(handleRoute?.layout).toBe(PublicProfileShell)
  })
})

describe('an unknown address ends on the not-found page', () => {
  it('declares a catch-all outside the authenticated shell', () => {
    expect(withPath('*').length).toBeGreaterThanOrEqual(1)
  })

  it('never sends a catch-all to the login form', () => {
    for (const route of withPath('*')) {
      expect(navigateTarget(route.element)).toBeUndefined()
    }
  })

  it('no longer borrows the sign-in door as its shell either', () => {
    for (const route of withPath('*')) {
      expect(route.layout).not.toBe(AuthLayout)
      expect(route.layout).toBe(PublicProfileShell)
    }
  })

  it('renders the not-found page from every catch-all', () => {
    for (const route of withPath('*')) {
      expect(elementType(route.element)).toBe(NotFoundPage)
    }
  })

  it('offers a catch-all that an anonymous visitor can reach', () => {
    const outermost = Math.min(...withPath('*').map((route) => route.depth))
    const shallow = withPath('*').filter((route) => route.depth === outermost)
    expect(shallow.length).toBeGreaterThanOrEqual(1)
    for (const route of shallow) expect(elementType(route.element)).toBe(NotFoundPage)
  })

  it('wraps the mistyped single segment in the same shell as the catch-all, not in nothing', () => {
    const catchAll = Math.min(...withPath('*').map((route) => route.depth))
    const handle = Math.min(...withPath('/:handle').map((route) => route.depth))
    expect(handle).toBe(catchAll)
  })

  it('never leaves a not-found route at the top level, which stripped it of the brand shell', () => {
    const topLevel = Math.min(...routes.map((route) => route.depth))
    const bare = [...withPath('*'), ...withPath('/:handle')].filter(
      (route) => route.depth === topLevel,
    )
    expect(bare).toEqual([])
  })
})

describe('the catalog absorbed the separate my-events page', () => {
  it('still answers at /events, so an old bookmark is not a 404', () => {
    expect(withPath('/events')).toHaveLength(1)
    expect(withPath('/events')[0]?.element).toBeDefined()
  })

  it('answers there with a redirect into the catalog, not with a page of its own', () => {
    const [eventsRoute] = withPath('/events')
    expect(navigateTarget(eventsRoute?.element)).toBe('/catalog?joined=true')
  })

  it('carries the participation filter, so the redirect lands on the events of the viewer', () => {
    const [eventsRoute] = withPath('/events')
    expect(navigateTarget(eventsRoute?.element)).toContain('joined=true')
  })

  it('redirects the root to the catalog rather than answering there', () => {
    const rootRedirects = routes
      .filter((route) => route.path === undefined)
      .map((route) => navigateTarget(route.element))
      .filter((target): target is string => target !== undefined)
    expect(rootRedirects).toContain('/catalog')
  })

  it('keeps the root a redirect, so a stale bookmark never lands on a 404', () => {
    const rootRedirects = routes
      .filter((route) => route.path === undefined)
      .map((route) => navigateTarget(route.element))
      .filter((target): target is string => target !== undefined)
    expect(rootRedirects).not.toHaveLength(0)
    for (const target of rootRedirects) {
      expect(withPath(target)).toHaveLength(1)
    }
  })
})

describe('an email-change link works without a session, on either address', () => {
  it.each(['/email-change/confirm', '/email-change/cancel'])('mounts %s reachably', (path) => {
    expect(withPath(path)).toHaveLength(1)
  })
})

describe('the not-found page is reachable without a session', () => {
  it('declares exactly one catch-all, so none is trapped behind a guard', () => {
    expect(withPath('*')).toHaveLength(1)
  })

  it('keeps that catch-all shallow, outside the authenticated shell', () => {
    const [splat] = withPath('*')
    const deepest = Math.max(...routes.map((route) => route.depth))
    expect(splat?.depth).toBeLessThan(deepest)
  })

  it('sends the profile redirect to a real address, not to the bare root', () => {
    const redirects = routes
      .map((route) => navigateTarget(route.element))
      .filter((target): target is string => target !== undefined)
    for (const target of redirects) {
      expect(target).not.toMatch(/^\/\?/)
    }
  })
})
