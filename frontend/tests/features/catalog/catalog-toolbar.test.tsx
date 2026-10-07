import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogFilterValues } from '@/features/catalog/catalog-filter-conditions'
import { CatalogToolbar, type CatalogToolbarProps } from '@/features/catalog/catalog-toolbar'
import { i18n } from '@/shared/i18n/config'

const NO_FILTERS: CatalogFilterValues = {
  state: '',
  format: '',
  kind: '',
  origin: '',
  joined: '',
  from: '',
  to: '',
}

function props(overrides: Partial<CatalogToolbarProps> = {}): CatalogToolbarProps {
  return {
    layout: 'table',
    sort: 'start_at',
    order: 'asc',
    filters: NO_FILTERS,
    columns: ['title', 'start'],
    cardFields: ['dates', 'prize'],
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
    ...overrides,
  }
}

describe('catalog toolbar', () => {
  it('offers free-text search in either view, as the admin list does', () => {
    for (const layout of ['table', 'grid'] as const) {
      const { unmount } = renderWithProviders(<CatalogToolbar {...props({ layout })} />)
      expect(
        screen.getByLabelText(i18n.t('event:list.searchAria')),
        `layout ${layout}`,
      ).toBeInTheDocument()
      unmount()
    }
  })

  it('reports what was typed into search', async () => {
    const onSearch = vi.fn()
    const { user } = renderWithProviders(<CatalogToolbar {...props({ onSearch })} />)
    await user.type(screen.getByLabelText(i18n.t('event:list.searchAria')), 'a')
    expect(onSearch).toHaveBeenCalledWith('a')
  })

  it('hides the sort control in the table, where the headers already sort', () => {
    renderWithProviders(<CatalogToolbar {...props({ layout: 'table' })} />)
    expect(screen.queryByLabelText(i18n.t('event:catalog.sortAria'))).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('event:catalog.columns.action') }),
    ).toBeInTheDocument()
  })

  it('keeps sorting in the tiles as one icon that names the current order', () => {
    renderWithProviders(<CatalogToolbar {...props({ layout: 'grid' })} />)
    const trigger = screen.getByRole('button', { name: 'Sort: Start date, Ascending' })
    expect(trigger.textContent?.trim(), 'the sort button printed words again').toBe('')
  })

  it('picks the direction inside the sort panel', async () => {
    const onOrder = vi.fn()
    const { user } = renderWithProviders(
      <CatalogToolbar {...props({ layout: 'grid', order: 'asc', onOrder })} />,
    )
    await user.click(screen.getByRole('button', { name: 'Sort: Start date, Ascending' }))
    const panel = await screen.findByRole('dialog', { name: 'Sort' })
    await user.click(within(panel).getByRole('button', { name: 'Descending' }))
    expect(onOrder).toHaveBeenCalledWith('desc')
  })

  it('titles the sort panel and offers reset only once the order differs from the default', async () => {
    const onResetSort = vi.fn()
    const first = renderWithProviders(<CatalogToolbar {...props({ layout: 'grid' })} />)
    await first.user.click(screen.getByRole('button', { name: /^Sort: / }))
    const plain = await screen.findByRole('dialog', { name: 'Sort' })
    expect(within(plain).queryByRole('button', { name: 'Reset to default' })).toBeNull()
    first.unmount()

    const { user } = renderWithProviders(
      <CatalogToolbar {...props({ layout: 'grid', sort: 'title', order: 'desc', onResetSort })} />,
    )
    await user.click(screen.getByRole('button', { name: 'Sort: Title, Descending' }))
    const changed = await screen.findByRole('dialog', { name: 'Sort' })
    const head = changed.querySelector('[data-panel-head]') as HTMLElement
    await user.click(within(head).getByRole('button', { name: 'Reset to default' }))
    expect(onResetSort).toHaveBeenCalledOnce()
  })

  it('marks the chosen field and asks the list to sort by another', async () => {
    const onSort = vi.fn()
    const { user } = renderWithProviders(<CatalogToolbar {...props({ layout: 'grid', onSort })} />)
    await user.click(screen.getByRole('button', { name: /^Sort: / }))
    const panel = await screen.findByRole('dialog', { name: 'Sort' })
    expect(within(panel).getByRole('button', { name: 'Start date', pressed: true })).toBeTruthy()
    await user.click(within(panel).getByRole('button', { name: 'Title' }))
    expect(onSort).toHaveBeenCalledWith('title')
  })

  it('shows no result count beside the heading, which was noise', () => {
    renderWithProviders(<CatalogToolbar {...props()} />)
    expect(screen.getByRole('heading', { name: i18n.t('event:catalog.title') })).toBeInTheDocument()
    expect(document.querySelector('[aria-live="polite"]')).toBeNull()
  })

  it('separates the heading from the search with a scale step, not a hair', () => {
    renderWithProviders(<CatalogToolbar {...props()} />)
    const heading = screen.getByRole('heading', { name: i18n.t('event:catalog.title') })
    const group = heading.parentElement as HTMLElement
    expect(group.className).toContain('mr-2')
    expect(group.className).not.toContain('mr-1')
  })

  it('shows a spinner in place of the download icon while the file is prepared', () => {
    renderWithProviders(<CatalogToolbar {...props({ exporting: true })} />)
    const download = screen.getByRole('button', { name: 'Download CSV' })
    expect(download).toBeDisabled()
    expect(download.querySelector('[data-busy-spin]')).not.toBeNull()
  })

  it('downloads without announcing success, and only speaks up when it fails', () => {
    const page = readFileSync(join(process.cwd(), 'src/features/catalog/catalog.tsx'), 'utf8')
    const run = page.slice(
      page.indexOf('function runExport'),
      page.indexOf('function runExport') + 300,
    )
    expect(run, 'a success toast came back after the download').not.toContain('toast.success')
    expect(run).toContain('toast.error')
  })

  it('opens the sort panel centred under its button', async () => {
    const { user } = renderWithProviders(<CatalogToolbar {...props({ layout: 'grid' })} />)
    await user.click(screen.getByRole('button', { name: /^Sort: / }))
    const panel = await screen.findByRole('dialog', { name: 'Sort' })
    expect(panel.getAttribute('data-align')).toBe('center')
  })

  it('keeps the export and the view switch in both views', () => {
    for (const layout of ['table', 'grid'] as const) {
      const { unmount } = renderWithProviders(<CatalogToolbar {...props({ layout })} />)
      const download = screen.getByRole('button', { name: 'Download CSV' })
      expect(download.textContent?.trim(), 'the download button printed words again').toBe('')
      expect(screen.getByLabelText(i18n.t('event:catalog.layout.table'))).toBeInTheDocument()
      expect(screen.getByLabelText(i18n.t('event:catalog.layout.grid'))).toBeInTheDocument()
      unmount()
    }
  })
})
