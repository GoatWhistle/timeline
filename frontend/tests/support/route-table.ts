import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { Navigate, Route } from 'react-router'
import { AppRouter } from '@/app/router'

export type RouteRecord = {
  path: string | undefined
  element: ReactNode
  depth: number
  layout: unknown
}

function childrenOf(node: ReactNode): ReactNode[] {
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  const children = props.children
  if (children === undefined || children === null) return []
  return Array.isArray(children) ? (children as ReactNode[]) : [children]
}

export function elementType(node: ReactNode): unknown {
  return isValidElement(node) ? node.type : undefined
}

function collect(
  node: ReactNode,
  depth = 0,
  layout: unknown = undefined,
  out: RouteRecord[] = [],
): RouteRecord[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, depth, layout, out)
    return out
  }
  if (!isValidElement(node)) return out

  const element = node as ReactElement<{ path?: string; element?: ReactNode }>
  const isRoute = element.type === Route
  const isLayoutRoute = isRoute && element.props.path === undefined
  const nextDepth = isRoute ? depth + 1 : depth
  const nextLayout = isLayoutRoute ? elementType(element.props.element) : layout

  if (isRoute) {
    out.push({ path: element.props.path, element: element.props.element, depth, layout })
  }

  for (const child of childrenOf(node)) collect(child, nextDepth, nextLayout, out)
  return out
}

export const routes = collect(AppRouter())

export function withPath(path: string): RouteRecord[] {
  return routes.filter((route) => route.path === path)
}

export function navigateTarget(node: ReactNode): string | undefined {
  if (!isValidElement(node) || node.type !== Navigate) return undefined
  return (node.props as { to?: string }).to
}
