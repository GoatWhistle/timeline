import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_SORTS,
  resolveAdminColumns,
  resolveColumns,
} from '@/entities/catalog/catalog.views'
import { CatalogTable } from '@/features/catalog/catalog-table'
import { AdminTable } from '@/features/event-list/admin/admin-table'
import type { CatalogEvent, EventResponse } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const event = {
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
  team_size_min: 2,
  team_size_max: 10,
  prize_pool: '5000.00',
  prize_currency: 'USD',
  joined: false,
} as CatalogEvent

function table(onSort = vi.fn()) {
  return {
    onSort,
    ...renderWithProviders(
      <CatalogTable
        items={[event]}
        columns={['title', 'duration', 'prize', 'teamMin', 'teamMax']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={vi.fn()}
        onSort={onSort}
      />,
    ),
  }
}

const header = (key: string) =>
  screen.getByRole('button', { name: i18n.t(`event:catalog.column.${key}`) })

describe('the team size is two columns, smallest first, each sortable', () => {
  it('opens a saved single team column into the smallest and the largest, in that order', () => {
    const catalog = resolveColumns(['title', 'teamSize', 'state']) as string[]
    expect(catalog).not.toContain('teamSize')
    expect(catalog.indexOf('teamMin')).toBeGreaterThan(-1)
    expect(catalog.indexOf('teamMin')).toBeLessThan(catalog.indexOf('teamMax'))
    expect(resolveAdminColumns(['title', 'teamSize'])).toEqual(['title', 'teamMin', 'teamMax'])
  })

  it('shows each bound in its own cell', () => {
    table()
    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells.at(-2)).toBe('2')
    expect(cells.at(-1)).toBe('10')
  })

  it('offers the prize and both team bounds as sorts, from the headers and the panel', async () => {
    expect(CATALOG_SORTS).toEqual(expect.arrayContaining(['prize', 'team_min', 'team_max']))
    const { user, onSort } = table()
    await user.click(header('prize'))
    expect(onSort).toHaveBeenLastCalledWith('prize')
    await user.click(header('teamMin'))
    expect(onSort).toHaveBeenLastCalledWith('team_min')
    await user.click(header('teamMax'))
    expect(onSort).toHaveBeenLastCalledWith('team_max')
  })

  it('sorts the same columns in the admin table', async () => {
    const onSort = vi.fn()
    const { user } = renderWithProviders(
      <AdminTable
        items={[event as unknown as EventResponse]}
        columns={['title', 'prize', 'teamMin', 'teamMax']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={vi.fn()}
        onSort={onSort}
      />,
    )
    await user.click(header('prize'))
    await user.click(header('teamMin'))
    await user.click(header('teamMax'))
    expect(onSort.mock.calls.map(([sort]) => sort)).toEqual(['prize', 'team_min', 'team_max'])
  })
})

describe('short numbers sit as one block in the middle of their column', () => {
  it('centres a fixed box in the cell and right-aligns the digits inside it', () => {
    const { container } = table()
    for (const key of ['teamMin', 'teamMax', 'duration']) {
      const th = header(key).closest('th') as HTMLElement
      expect(th.className, `${key} header`).toContain('text-center')
    }
    const boxes = container.querySelectorAll('tbody [data-number-box]')
    expect(boxes).toHaveLength(4)
    for (const box of boxes) {
      const td = box.closest('td') as HTMLElement
      expect(td.hasAttribute('data-lead'), 'a number cell was set flush left').toBe(false)
      expect(td.closest('table')?.className).toContain('[&_tbody_td]:text-center')
      const digits = box.matches('.text-right') ? box : box.querySelector('.text-right')
      expect(digits, 'the digits float free, so 5 and 10 centre on each other').toBeTruthy()
      expect((digits as HTMLElement).className).toMatch(/(^|\s)(min-)?w-\[\d+ch\]/)
    }
  })

  it('keeps the unit of a duration beside its number rather than in the number box', () => {
    const { container } = table()
    const box = container.querySelector('tbody td [data-number-box]:not(.w-\\[3ch\\])')
    expect(box?.children[0]?.textContent).toBe('19')
    expect(box?.children[1]?.textContent).toBe('days')
  })
})

describe('the number of tracks is its own sortable column', () => {
  function tracksTable(tracks: CatalogEvent['tracks'], onSort = vi.fn()) {
    return {
      onSort,
      ...renderWithProviders(
        <CatalogTable
          items={[{ ...event, tracks }]}
          columns={['title', 'tracks']}
          selected={null}
          sort="start_at"
          order="asc"
          onSelect={vi.fn()}
          onSort={onSort}
        />,
      ),
    }
  }

  it('counts the tracks in the cell and sorts by that count from the header', async () => {
    const { user, onSort } = tracksTable([
      { id: 'tr_1', track_no: 1, name: 'Agents', prize_total: '0' },
      { id: 'tr_2', track_no: 2, name: 'Voice', prize_total: '0' },
    ])
    expect(screen.getAllByRole('cell').at(-1)?.textContent).toBe('2')
    await user.click(header('tracks'))
    expect(onSort).toHaveBeenLastCalledWith('tracks')
    expect(CATALOG_SORTS).toContain('tracks')
  })

  it('draws a dash rather than a zero when an event has no tracks', () => {
    tracksTable([])
    expect(screen.getAllByRole('cell').at(-1)?.textContent).toContain('—')
  })
})
