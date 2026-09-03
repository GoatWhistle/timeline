import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CatalogTable } from '@/features/catalog/catalog-table'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

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
]

function render(sort: 'start_at' | 'title', order: 'asc' | 'desc', onSort = vi.fn()) {
  return {
    onSort,
    ...renderWithProviders(
      <CatalogTable
        items={items}
        columns={['title', 'period']}
        selected={null}
        sort={sort}
        order={order}
        onSelect={vi.fn()}
        onSort={onSort}
      />,
    ),
  }
}

describe('catalog table sorting', () => {
  it('sorts from the column headers now that the toolbar control is gone', async () => {
    const onSort = vi.fn()
    const { user } = render('start_at', 'asc', onSort)

    await user.click(screen.getByRole('button', { name: i18n.t('event:catalog.column.title') }))
    expect(onSort).toHaveBeenCalledWith('title')

    await user.click(screen.getByRole('button', { name: i18n.t('event:catalog.column.period') }))
    expect(onSort).toHaveBeenCalledWith('start_at')
  })

  it('announces the active column and its direction to assistive technology', () => {
    const { unmount } = render('title', 'asc')
    expect(
      screen.getByRole('columnheader', { name: i18n.t('event:catalog.column.title') }),
    ).toHaveAttribute('aria-sort', 'ascending')
    unmount()

    render('title', 'desc')
    expect(
      screen.getByRole('columnheader', { name: i18n.t('event:catalog.column.title') }),
    ).toHaveAttribute('aria-sort', 'descending')
  })

  it('leaves the inactive sortable column unmarked', () => {
    render('title', 'asc')
    expect(
      screen.getByRole('columnheader', { name: i18n.t('event:catalog.column.period') }),
    ).not.toHaveAttribute('aria-sort')
  })
})
