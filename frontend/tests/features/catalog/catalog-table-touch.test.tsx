import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CatalogTable } from '@/features/catalog/catalog-table'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const FLOOR = ['pointer-coarse:after:min-h-11', 'pointer-coarse:after:min-w-11']

const CENTRED = [
  'pointer-coarse:after:left-1/2',
  'pointer-coarse:after:top-1/2',
  'pointer-coarse:after:-translate-x-1/2',
  'pointer-coarse:after:-translate-y-1/2',
]

const items: CatalogEvent[] = [
  {
    id: 'e1',
    title: 'National AI Hackathon',
    kind: 'HACKATHON',
    format: 'ONLINE',
    origin: 'RU',
    effective_format: 'ONLINE',
    offline_stages: [],
    start_at: '2026-10-01T00:00:00Z',
    end_at: '2026-10-20T00:00:00Z',
    state: 'UPCOMING',
    tracks: [],
    joined: false,
  },
  {
    id: 'e2',
    title: 'Winter Build Sprint',
    kind: 'HACKATHON',
    format: 'ONLINE',
    origin: 'RU',
    effective_format: 'ONLINE',
    offline_stages: [],
    start_at: '2026-11-01T00:00:00Z',
    end_at: '2026-11-20T00:00:00Z',
    state: 'UPCOMING',
    tracks: [],
    joined: false,
  },
]

function render() {
  return renderWithProviders(
    <CatalogTable
      items={items}
      columns={['title', 'period']}
      selected={null}
      sort="start_at"
      order="asc"
      onSelect={vi.fn()}
      onSort={vi.fn()}
    />,
  )
}

function classesOfSortHeader(name: string): string[] {
  return screen.getByRole('button', { name }).className.split(/\s+/)
}

describe('the catalog table is reachable by thumb where a tablet shows it', () => {
  it('gives each sort header the 44px reach through the shared overlay', () => {
    render()
    for (const key of ['event:catalog.column.title', 'event:catalog.column.period']) {
      const classes = classesOfSortHeader(i18n.t(key))
      for (const name of FLOOR) expect(classes).toContain(name)
    }
  })

  it('centres the sort header reach so a short header is not dragged off its column', () => {
    render()
    for (const key of ['event:catalog.column.title', 'event:catalog.column.period']) {
      const classes = classesOfSortHeader(i18n.t(key))
      for (const name of CENTRED) expect(classes).toContain(name)
      expect(classes).toContain('relative')
      expect(classes).toContain('pointer-coarse:after:size-full')
    }
  })

  it('grows the header row so the reach it holds is not clipped', () => {
    const { container } = render()
    const headers = [...container.querySelectorAll('thead th')]
    expect(headers.length).toBeGreaterThan(0)
    for (const header of headers) {
      expect(header.className.split(/\s+/)).toContain('pointer-coarse:h-11')
    }
  })

  it('grows a stacked row instead of overlaying it onto its neighbours', () => {
    const { container } = render()
    const cells = [...container.querySelectorAll('tbody tr td:first-child')]
    expect(cells).toHaveLength(items.length)
    for (const cell of cells) {
      const inner = cell.querySelector('span')
      expect(inner?.className.split(/\s+/)).toContain('pointer-coarse:h-11')
      expect(cell.className.split(/\s+/)).toContain('pointer-coarse:py-0')
    }
  })

  it('spends no centred overlay on a title button, which would steal the next row', () => {
    render()
    for (const item of items) {
      const classes = screen.getByRole('button', { name: item.title }).className.split(/\s+/)
      for (const name of FLOOR) expect(classes).not.toContain(name)
      expect(classes).toContain('pointer-coarse:self-stretch')
    }
  })

  it('leaves the drawn desktop density of the table exactly as it was', () => {
    const { container } = render()
    for (const header of container.querySelectorAll('thead th')) {
      expect(header.className.split(/\s+/)).toContain('h-row')
    }
    for (const cell of container.querySelectorAll('tbody tr td:first-child')) {
      expect(cell.className.split(/\s+/)).toContain('py-2')
    }
  })

  it('spends every one of those reaches only where the pointer is coarse', () => {
    const { container } = render()
    const touched = [...container.querySelectorAll('th, td, button, span')].flatMap((element) =>
      element.className
        .toString()
        .split(/\s+/)
        .filter(
          (name) => name.includes('after:') || name.includes('h-11') || name === 'self-stretch',
        ),
    )
    expect(touched.length).toBeGreaterThan(0)
    for (const name of touched) expect(name.startsWith('pointer-coarse:')).toBe(true)
  })
})
