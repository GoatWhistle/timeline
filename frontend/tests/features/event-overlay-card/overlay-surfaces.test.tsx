import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { act } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { EVENT_OVERLAY_PARAM, useEventOverlay } from '@/features/event-overlay-card'

const SRC = resolve(process.cwd(), 'src')

const SURFACES: [string, string][] = [
  ['schedule', 'features/schedule/my/schedule.tsx'],
  ['my events list', 'features/event-list/my/event-list.tsx'],
  ['admin events list', 'features/event-list/admin/event-list.tsx'],
  ['catalog table and tiles', 'features/catalog/catalog.tsx'],
]

function wrapper(route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  }
}

function useOverlayUrl() {
  return { ...useEventOverlay(), search: useLocation().search }
}

describe('the card is one component reached the same way everywhere', () => {
  it.each(SURFACES.filter(([name]) => name !== 'schedule'))(
    'reaches the card from the %s through the shared feature',
    (_name, file) => {
      const text = readFileSync(resolve(SRC, file), 'utf8')
      expect(text).toContain('@/features/event-overlay-card')
      expect(text).toMatch(/openEventCard\([^)]/)
    },
  )

  it('resolves an admin-wide surface through the admin endpoint, not the assigned one', () => {
    const adminList = readFileSync(resolve(SRC, 'features/event-list/admin/event-list.tsx'), 'utf8')

    expect(adminList).toContain('AdminEventOverlay')
    expect(adminList).not.toContain('AssignedEventOverlay')

    const resolvers = readFileSync(
      resolve(SRC, 'features/event-overlay-card/overlay-resolvers.ts'),
      'utf8',
    )
    const admin = resolvers.slice(
      resolvers.indexOf('export function useAdminOverlay'),
      resolvers.indexOf('export function useCatalogOverlay'),
    )
    expect(admin).toContain('adminEventQuery')
    expect(admin).not.toContain('eventCardQuery')
  })

  it('keeps the assigned endpoint for the surfaces that only show assigned events', () => {
    const myList = readFileSync(resolve(SRC, 'features/event-list/my/event-list.tsx'), 'utf8')
    expect(myList).toContain('AssignedEventOverlay')
    expect(myList).not.toContain('AdminEventOverlay')
  })

  it('mounts exactly one overlay per surface', () => {
    for (const [, file] of SURFACES.filter(([name]) => name !== 'schedule')) {
      const text = readFileSync(resolve(SRC, file), 'utf8')
      const mounts = text.match(/<(Admin|Assigned|Catalog)EventOverlay\b/g) ?? []
      expect(mounts, file).toHaveLength(1)
    }
  })

  it('opens and closes through one search parameter, whatever opened it', () => {
    const { result } = renderHook(useOverlayUrl, { wrapper: wrapper('/catalog?layout=grid') })

    expect(result.current.open).toBe(false)

    act(() => result.current.openEventCard('ev_9'))
    expect(result.current.eventId).toBe('ev_9')
    expect(result.current.open).toBe(true)
    expect(result.current.search).toContain(`${EVENT_OVERLAY_PARAM}=ev_9`)
    expect(result.current.search).toContain('layout=grid')

    act(() => result.current.closeEventCard())
    expect(result.current.eventId).toBeNull()
    expect(result.current.open).toBe(false)
    expect(result.current.search).not.toContain(EVENT_OVERLAY_PARAM)
    expect(result.current.search).toContain('layout=grid')
  })

  it('treats an empty parameter as closed rather than as an event with no id', () => {
    const { result } = renderHook(useOverlayUrl, {
      wrapper: wrapper(`/catalog?${EVENT_OVERLAY_PARAM}=`),
    })
    expect(result.current.open).toBe(false)
    expect(result.current.eventId).toBeNull()
  })
})
