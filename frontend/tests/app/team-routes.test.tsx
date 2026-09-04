import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRouter, staysAnonymous } from '@/app/router'
import { TEAM_SECTIONS } from '@/features/teams/team-section-nav'

type RouteRecord = { path: string | undefined; index: boolean }

function childrenOf(node: ReactNode): ReactNode[] {
  if (!isValidElement(node)) return []
  const children = (node.props as { children?: ReactNode }).children
  if (children === undefined || children === null) return []
  return Array.isArray(children) ? (children as ReactNode[]) : [children]
}

function collect(node: ReactNode, prefix: string, out: RouteRecord[] = []): RouteRecord[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, prefix, out)
    return out
  }
  if (!isValidElement(node)) return out

  const element = node as ReactElement<{ path?: string; index?: boolean }>
  let next = prefix
  if (element.type === Route) {
    const path = element.props.path
    if (path !== undefined && !path.startsWith('/')) next = `${prefix}/${path}`
    else if (path !== undefined) next = path
    out.push({ path: next, index: element.props.index === true })
  }

  for (const child of childrenOf(node)) collect(child, next, out)
  return out
}

const routes = collect(AppRouter(), '')
const paths = routes.map((route) => route.path)

describe('a team is several addresses, not one screen holding everything', () => {
  it.each(['/teams/:id/members', '/teams/:id/events', '/teams/:id/events/:eventId'])(
    'declares %s as its own address',
    (path) => {
      expect(paths).toContain(path)
    },
  )

  it('keeps an entry in one hackathon on an address of its own', () => {
    expect(paths).toContain('/teams/:id/events/:eventId')
  })

  it('answers the bare team address with a section of its own, not a blank frame', () => {
    const atTeam = routes.filter((route) => route.path === '/teams/:id')
    expect(atTeam.filter((route) => route.index)).toHaveLength(1)
    expect(atTeam.filter((route) => !route.index)).toHaveLength(1)
  })

  it('offers a route for every section the navigation names', () => {
    for (const { segment } of TEAM_SECTIONS) {
      const path = segment === '' ? '/teams/:id' : `/teams/:id/${segment}`
      expect(paths).toContain(path)
    }
  })

  it.each(['/teams/abc/members', '/teams/abc/events', '/teams/abc/events/ev_1'])(
    'sends a logged-out visitor at %s to the login form',
    (path) => {
      expect(staysAnonymous(path)).toBe(false)
    },
  )
})
