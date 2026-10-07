import { act, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_CARD_FIELDS_KEY,
  DEFAULT_CARD_FIELDS,
  resolveCardFields,
  useCardFields,
} from '@/entities/catalog/card-fields'
import { CatalogCard } from '@/entities/catalog/catalog-card'
import type { CatalogFilterValues } from '@/features/catalog/catalog-filter-conditions'
import { CatalogToolbar, type CatalogToolbarProps } from '@/features/catalog/catalog-toolbar'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { EXIT_MS } from '@/shared/hooks/use-exit-presence/use-exit-presence'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

beforeEach(() => localStorage.clear())

const event = {
  id: 'e1',
  title: 'Northern Lights AI Hackathon',
  organizer: 'Timeline test data',
  kind: 'HACKATHON',
  format: 'HYBRID',
  origin: 'RU',
  effective_format: 'HYBRID',
  offline_stages: [],
  start_at: '2026-10-17T09:00:00Z',
  end_at: '2026-10-20T09:00:00Z',
  state: 'UPCOMING',
  tracks: [],
  team_size_min: 2,
  team_size_max: 5,
  prize_pool: '500000.00',
  prize_currency: 'RUB',
  joined: false,
} as CatalogEvent

function tile(fields = DEFAULT_CARD_FIELDS) {
  return renderWithProviders(
    <CatalogCard event={event} selected={false} onSelect={vi.fn()} fields={fields} />,
  )
}

const NO_FILTERS: CatalogFilterValues = {
  state: '',
  format: '',
  kind: '',
  origin: '',
  joined: '',
  from: '',
  to: '',
}

function toolbarProps(layout: 'table' | 'grid'): CatalogToolbarProps {
  return {
    layout,
    sort: 'start_at',
    order: 'asc',
    filters: NO_FILTERS,
    columns: ['title'],
    cardFields: DEFAULT_CARD_FIELDS,
    exporting: false,
    searchValue: '',
    searchRef: { current: null },
    onSearch: vi.fn(),
    onLayout: vi.fn(),
    onSort: vi.fn(),
    onOrder: vi.fn(),
    onResetSort: vi.fn(),
    onFilters: vi.fn(),
    onResetFilters: vi.fn(),
    onToggleColumn: vi.fn(),
    onResetColumns: vi.fn(),
    onToggleField: vi.fn(),
    onResetFields: vi.fn(),
    onExport: vi.fn(),
  }
}

function toolbar(layout: 'table' | 'grid') {
  return renderWithProviders(<CatalogToolbar {...toolbarProps(layout)} />)
}

describe('a tile shows only the fields the reader asked for', () => {
  it('starts with the dates and the prize, and nothing else', () => {
    expect(DEFAULT_CARD_FIELDS).toEqual(['dates', 'prize'])
    const { container } = tile()
    expect(container.querySelector('[data-card-dates]')).not.toBeNull()
    expect(container.textContent).toContain('500,000')
    expect(
      container.querySelector('[data-card-duration]'),
      'the duration is on by default',
    ).toBeNull()
    expect(screen.queryByText('Timeline test data'), 'the organiser is on by default').toBeNull()
    expect(container.textContent).not.toContain(i18n.t('event:place.format.HYBRID'))
    expect(container.querySelectorAll('svg.lucide-user')).toHaveLength(0)
  })

  it('brings back each field once it is switched on', () => {
    const { container } = tile(['dates', 'duration', 'format', 'team', 'prize', 'organizer'])
    expect(container.querySelector('[data-card-duration]')).not.toBeNull()
    expect(screen.getByText('Timeline test data')).toBeInTheDocument()
    expect(container.textContent).toContain(i18n.t('event:place.format.HYBRID'))
    expect(container.querySelectorAll('svg.lucide-user')).toHaveLength(5)
  })

  it('remembers the choice for the next visit and forgets it on reset', () => {
    const first = renderHook(() => useCardFields(CATALOG_CARD_FIELDS_KEY))
    act(() => first.result.current.toggle('team'))
    expect(first.result.current.fields).toEqual(['dates', 'team', 'prize'])
    first.unmount()

    const again = renderHook(() => useCardFields(CATALOG_CARD_FIELDS_KEY))
    expect(again.result.current.fields, 'the choice was forgotten').toEqual([
      'dates',
      'team',
      'prize',
    ])
    act(() => again.result.current.reset())
    expect(again.result.current.fields).toEqual(DEFAULT_CARD_FIELDS)
    expect(localStorage.getItem(CATALOG_CARD_FIELDS_KEY)).toBeNull()
  })

  it('ignores a saved field it does not know', () => {
    expect(resolveCardFields(['prize', 'kind', 7])).toEqual(['prize'])
    expect(resolveCardFields('broken')).toEqual(DEFAULT_CARD_FIELDS)
  })
})

describe('the tile view puts the field picker and the sort side by side', () => {
  it('offers card fields and sort in the tile view, the sort sliding in', () => {
    const { container } = toolbar('grid')
    expect(container.querySelector('[data-fields-trigger]')).not.toBeNull()
    expect(container.querySelector('[data-sort-trigger]')).not.toBeNull()
    expect(container.querySelector('[data-columns-trigger]')).toBeNull()
    const slot = container.querySelector('[data-sort-slot]') as HTMLElement
    expect(slot.className, 'the sort pops in without motion').toContain(
      'motion-safe:animate-tool-in',
    )
  })

  it('keeps the column picker alone in the table view, with no sort beside it', () => {
    const { container } = toolbar('table')
    expect(container.querySelector('[data-columns-trigger]')).not.toBeNull()
    expect(container.querySelector('[data-fields-trigger]')).toBeNull()
    expect(container.querySelector('[data-sort-trigger]')).toBeNull()
  })

  it('lets the sort slide out before it leaves for the table view', () => {
    vi.useFakeTimers()
    try {
      const view = toolbar('grid')
      view.rerender(<CatalogToolbar {...toolbarProps('table')} />)
      const slot = view.container.querySelector('[data-sort-slot]') as HTMLElement
      expect(slot, 'the sort vanished without leaving').not.toBeNull()
      expect(slot.hasAttribute('data-leaving')).toBe(true)
      expect(slot.className).toContain('motion-safe:animate-tool-out')
      expect(slot.getAttribute('aria-hidden')).toBe('true')
      act(() => {
        vi.advanceTimersByTime(EXIT_MS)
      })
      expect(view.container.querySelector('[data-sort-slot]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('drops the sort at once when the reader asked for less motion', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    try {
      const view = toolbar('grid')
      view.rerender(<CatalogToolbar {...toolbarProps('table')} />)
      act(() => {
        vi.advanceTimersByTime(0)
      })
      expect(view.container.querySelector('[data-sort-slot]')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })
})
