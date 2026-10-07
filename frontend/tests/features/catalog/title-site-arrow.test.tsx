import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TITLE_SITE } from '@/entities/catalog/catalog-table-row'
import { CatalogSortControl } from '@/features/catalog/catalog-sort-control'
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
  title: 'Harbour Voice Agents Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'WORLD',
  effective_format: 'ONLINE',
  offline_stages: [],
  start_at: '2026-09-01T00:00:00Z',
  end_at: '2026-10-01T00:00:00Z',
  state: 'ACTIVE',
  tracks: [],
  joined: false,
  color: { family: 'WORLD', slot: 8 },
  website_url: 'https://example.org/harbour',
} as CatalogEvent

const siteName = i18n.t('event:catalog.card.websiteOf', { title: event.title })

function catalog(item: CatalogEvent, onSelect = vi.fn()) {
  return {
    onSelect,
    ...renderWithProviders(
      <CatalogTable
        items={[item]}
        columns={['title', 'state']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={onSelect}
        onSort={vi.fn()}
      />,
    ),
  }
}

describe('a table title carries the arrow to the event site, like the tile does', () => {
  it('puts the arrow straight after the title in the title cell', () => {
    catalog(event)
    const link = screen.getByRole('link', { name: siteName })
    expect(link.getAttribute('href')).toBe('https://example.org/harbour')
    const title = screen.getByRole('button', { name: event.title })
    expect(title.nextElementSibling, 'the arrow drifted away from the title').toBe(link)
    expect(link.closest('td')?.hasAttribute('data-lead')).toBe(true)
    expect(
      link.querySelector('svg[data-corner-arrow]'),
      'a different glyph from the tile',
    ).toBeTruthy()
  })

  it('paints the arrow in the event colour at the strength of the tile frame', () => {
    catalog(event)
    const link = screen.getByRole('link', { name: siteName })
    expect(link.getAttribute('data-event-family')).toBe('WORLD')
    expect(link.getAttribute('data-event-slot')).toBe('8')
    expect(TITLE_SITE, 'the arrow went grey').toContain('text-event-tint/70')
  })

  it('opens the site without also selecting the row', () => {
    const { onSelect } = catalog(event)
    fireEvent.click(screen.getByRole('link', { name: siteName }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('draws no arrow when the event has no site', () => {
    catalog({ ...event, website_url: undefined })
    expect(screen.queryByRole('link', { name: siteName })).toBeNull()
  })

  it('shows the same arrow in the admin table', () => {
    renderWithProviders(
      <AdminTable
        items={[event as unknown as EventResponse]}
        columns={['title', 'state']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={vi.fn()}
        onSort={vi.fn()}
      />,
    )
    expect(screen.getByRole('link', { name: siteName }).getAttribute('data-event-family')).toBe(
      'WORLD',
    )
  })
})

describe('the sort direction is a list with room for each word', () => {
  it('stacks the two directions as rows, never squeezed side by side', async () => {
    const { user } = renderWithProviders(
      <CatalogSortControl
        sort="start_at"
        order="asc"
        onSort={vi.fn()}
        onOrder={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /sort/i }))
    const list = (await screen.findByRole('dialog')).querySelector(
      '[data-sort-direction]',
    ) as HTMLElement
    expect(list.className, 'the directions are crammed into two columns again').toContain(
      'flex-col',
    )
    expect(list.className).not.toContain('grid-cols-2')
    for (const name of ['Ascending', 'Descending']) {
      const row = within(list).getByRole('button', { name })
      expect(row.querySelector('span.truncate')?.textContent).toBe(name)
      expect(row.querySelector('svg.lucide-check'), `${name} lost its check slot`).toBeTruthy()
    }
  })
})
