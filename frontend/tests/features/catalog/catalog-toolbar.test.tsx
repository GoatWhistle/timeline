import { screen } from '@testing-library/react'
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
  from: '',
  to: '',
}

function props(overrides: Partial<CatalogToolbarProps> = {}): CatalogToolbarProps {
  return {
    layout: 'table',
    sort: 'start_at',
    order: 'asc',
    filters: NO_FILTERS,
    columns: ['title', 'period'],
    total: 3,
    exporting: false,
    onLayout: vi.fn(),
    onSort: vi.fn(),
    onOrder: vi.fn(),
    onFilters: vi.fn(),
    onResetFilters: vi.fn(),
    onToggleColumn: vi.fn(),
    onResetColumns: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  }
}

describe('catalog toolbar', () => {
  it('offers no free-text search in either view', () => {
    for (const layout of ['table', 'grid'] as const) {
      const { unmount } = renderWithProviders(<CatalogToolbar {...props({ layout })} />)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText(i18n.t('event:list.searchAria')),
        `layout ${layout}`,
      ).not.toBeInTheDocument()
      unmount()
    }
  })

  it('hides the sort control in the table, where the headers already sort', () => {
    renderWithProviders(<CatalogToolbar {...props({ layout: 'table' })} />)
    expect(screen.queryByLabelText(i18n.t('event:catalog.sortAria'))).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:catalog.columns.action'))).toBeInTheDocument()
  })

  it('keeps the sort control in the tiles, which have no headers', () => {
    renderWithProviders(<CatalogToolbar {...props({ layout: 'grid' })} />)
    expect(screen.getByLabelText(i18n.t('event:catalog.sortAria'))).toBeInTheDocument()
    expect(screen.getByLabelText(i18n.t('event:catalog.order.asc'))).toBeInTheDocument()
  })

  it('flips the direction from the tiles order button', async () => {
    const onOrder = vi.fn()
    const { user } = renderWithProviders(
      <CatalogToolbar {...props({ layout: 'grid', order: 'asc', onOrder })} />,
    )
    await user.click(screen.getByLabelText(i18n.t('event:catalog.order.asc')))
    expect(onOrder).toHaveBeenCalledWith('desc')
  })

  it('keeps the export and the view switch in both views', () => {
    for (const layout of ['table', 'grid'] as const) {
      const { unmount } = renderWithProviders(<CatalogToolbar {...props({ layout })} />)
      expect(screen.getByText(i18n.t('event:catalog.export.action'))).toBeInTheDocument()
      expect(screen.getByLabelText(i18n.t('event:catalog.layout.table'))).toBeInTheDocument()
      expect(screen.getByLabelText(i18n.t('event:catalog.layout.grid'))).toBeInTheDocument()
      unmount()
    }
  })
})
