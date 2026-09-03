import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useSearchShortcut } from '@/features/event-list/use-search-shortcut'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { CATALOG } from '@/shared/keyboard/shortcut-catalog'
import { ShortcutProvider, ShortcutRegistry } from '@/shared/keyboard/shortcut-registry'
import { useSidebar } from '@/shared/ui/layout/sidebar/use-sidebar'

const KNOWN = new Map(
  CATALOG.flatMap((section) => section.shortcuts).map((entry) => [entry.id, entry]),
)

function mounted(use: () => void) {
  const registry = new ShortcutRegistry()
  function Wrapper({ children }: { children: ReactNode }) {
    return <ShortcutProvider registry={registry}>{children}</ShortcutProvider>
  }
  renderHook(use, { wrapper: Wrapper })
  return registry
}

function registeredBy(use: () => void) {
  return mounted(use)
    .getScopes()
    .flatMap((scope) => scope.shortcuts)
}

const LIST_PAGES = ['catalog-list', 'admin-event-list', 'my-event-list']

describe('what a page registers is what the catalogue declares', () => {
  it('registers list navigation under the catalogue ids, on every list page alike', () => {
    for (const scopeId of LIST_PAGES) {
      const registered = registeredBy(() =>
        useListNavigation({ ids: [], selected: null, onSelect: () => {}, scopeId }),
      )

      expect(registered.length, scopeId).toBeGreaterThan(0)
      for (const shortcut of registered) {
        expect(KNOWN.has(shortcut.id), `${scopeId}: ${shortcut.id}`).toBe(true)
        expect(shortcut.keys, `${scopeId}: ${shortcut.id}`).toEqual(KNOWN.get(shortcut.id)?.keys)
      }
    }
  })

  it('gives the same action the same id on every list page, so one setting governs all', () => {
    const idsPerPage = LIST_PAGES.map((scopeId) =>
      registeredBy(() =>
        useListNavigation({ ids: [], selected: null, onSelect: () => {}, scopeId }),
      )
        .map((shortcut) => shortcut.id)
        .sort(),
    )

    for (const ids of idsPerPage) expect(ids).toEqual(idsPerPage[0])
  })

  it('registers the search and sidebar shortcuts under their catalogue ids too', () => {
    const search = registeredBy(() => useSearchShortcut({ current: null }))
    const sidebar = registeredBy(() => useSidebar())

    for (const shortcut of [...search, ...sidebar]) {
      expect(KNOWN.has(shortcut.id), shortcut.id).toBe(true)
      expect(shortcut.keys, shortcut.id).toEqual(KNOWN.get(shortcut.id)?.keys)
    }
    expect(search.length + sidebar.length).toBeGreaterThan(1)
  })
})
