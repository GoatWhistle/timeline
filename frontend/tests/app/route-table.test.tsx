import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { Navigate, Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from '@/app/pages/not-found-page'
import { PublicProfileRoute } from '@/app/public-profile-route'
import { AppRouter, staysAnonymous } from '@/app/router'
import { isPublicProfileHandle } from '@/shared/routing/public-profile-path'

type RouteRecord = {
  path: string | undefined
  element: ReactNode
  depth: number
}

function childrenOf(node: ReactNode): ReactNode[] {
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  const children = props.children
  if (children === undefined || children === null) return []
  return Array.isArray(children) ? (children as ReactNode[]) : [children]
}

function collect(node: ReactNode, depth = 0, out: RouteRecord[] = []): RouteRecord[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, depth, out)
    return out
  }
  if (!isValidElement(node)) return out

  const element = node as ReactElement<{ path?: string; element?: ReactNode }>
  const isRoute = element.type === Route
  const nextDepth = isRoute ? depth + 1 : depth

  if (isRoute) {
    out.push({ path: element.props.path, element: element.props.element, depth })
  }

  for (const child of childrenOf(node)) collect(child, nextDepth, out)
  return out
}

const routes = collect(AppRouter())

const ANONYMOUS = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/email-change',
]

function withPath(path: string): RouteRecord[] {
  return routes.filter((route) => route.path === path)
}

function elementType(node: ReactNode): unknown {
  return isValidElement(node) ? node.type : undefined
}

function navigateTarget(node: ReactNode): string | undefined {
  if (!isValidElement(node) || node.type !== Navigate) return undefined
  return (node.props as { to?: string }).to
}

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
