import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { act } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { resolveLayout, resolveOrder, resolveSort } from '@/entities/catalog/catalog.views'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'

const DEFAULTS = {
  origin: '',
  kind: '',
  format: '',
  state: '',
  layout: 'table',
  selected: '',
  sort: '',
  order: '',
  from: '',
  to: '',
}

function wrapper(route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  }
}

function useCatalogUrlState() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  return { filters, setFilters, search: useLocation().search }
}

describe('catalog url state', () => {
  it('has no search key left in the defaults the page round-trips', () => {
    expect(Object.keys(DEFAULTS)).not.toContain('search')
    expect(Object.keys(DEFAULTS)).not.toContain('q')
  })

  it('keeps the sort and the direction when the view switches to the tiles', () => {
    const { result } = renderHook(useCatalogUrlState, {
      wrapper: wrapper('/catalog?sort=title&order=desc&layout=table'),
    })

    expect(resolveSort(result.current.filters.sort)).toBe('title')
    expect(resolveOrder(result.current.filters.order)).toBe('desc')

    act(() => result.current.setFilters({ layout: 'grid' }, { resetPage: false }))

    expect(resolveLayout(result.current.filters.layout)).toBe('grid')
    expect(resolveSort(result.current.filters.sort)).toBe('title')
    expect(resolveOrder(result.current.filters.order)).toBe('desc')
  })

  it('keeps the sort chosen in the tiles when the view switches back to the table', () => {
    const { result } = renderHook(useCatalogUrlState, {
      wrapper: wrapper('/catalog?layout=grid'),
    })

    act(() => result.current.setFilters({ sort: 'end_at', order: 'desc' }))
    act(() => result.current.setFilters({ layout: 'table' }, { resetPage: false }))

    expect(resolveLayout(result.current.filters.layout)).toBe('table')
    expect(resolveSort(result.current.filters.sort)).toBe('end_at')
    expect(resolveOrder(result.current.filters.order)).toBe('desc')
  })

  it('drops every filter on a reset, leaving the sort and the view alone', () => {
    const { result } = renderHook(useCatalogUrlState, {
      wrapper: wrapper('/catalog?state=UPCOMING&format=ONLINE&sort=title&layout=grid'),
    })

    act(() =>
      result.current.setFilters({
        state: undefined,
        format: undefined,
        kind: undefined,
        origin: undefined,
        from: undefined,
        to: undefined,
      }),
    )

    expect(result.current.filters.state).toBe('')
    expect(result.current.filters.format).toBe('')
    expect(resolveSort(result.current.filters.sort)).toBe('title')
    expect(resolveLayout(result.current.filters.layout)).toBe('grid')
  })
})
