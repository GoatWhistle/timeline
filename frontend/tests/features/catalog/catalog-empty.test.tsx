import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CatalogEmpty } from '@/features/catalog/catalog-empty'
import { i18n } from '@/shared/i18n/config'

describe('catalog empty state', () => {
  it('offers a working reset when filters are what hid everything', async () => {
    const onResetFilters = vi.fn()
    const { user } = renderWithProviders(
      <CatalogEmpty filtered={true} onResetFilters={onResetFilters} />,
    )

    expect(
      screen.getByRole('heading', { name: i18n.t('event:catalog.empty.filteredTitle') }),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:catalog.empty.filteredHint'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: i18n.t('event:catalog.empty.reset') }))
    expect(onResetFilters).toHaveBeenCalledTimes(1)
  })

  it('says the catalog itself is empty and offers no reset when no filter is set', () => {
    renderWithProviders(<CatalogEmpty filtered={false} onResetFilters={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: i18n.t('event:catalog.empty.title') }),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:catalog.empty.hint'))).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('event:catalog.empty.reset') }),
    ).not.toBeInTheDocument()
  })

  it('carries the brand figure of the 404 and the missing profile, labelled by the title', () => {
    const { container } = renderWithProviders(
      <CatalogEmpty filtered={false} onResetFilters={vi.fn()} />,
    )

    const figure = screen.getByRole('img', { name: i18n.t('event:catalog.empty.title') })
    expect(figure.tagName.toLowerCase()).toBe('svg')

    const spinner = container.querySelector('.motion-safe\\:animate-\\[spin_9s_linear_infinite\\]')
    expect(spinner).not.toBeNull()
  })
})
