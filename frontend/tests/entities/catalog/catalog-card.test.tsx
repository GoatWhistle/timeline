import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CatalogCard } from '@/entities/catalog/catalog-card'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const base: CatalogEvent = {
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
  joined: false,
}

const kazanFinal = {
  id: 's1',
  name: 'Final',
  type: 'DEMO' as const,
  start_at: '2026-10-15T00:00:00Z',
  end_at: '2026-10-16T00:00:00Z',
  place: { format: 'OFFLINE' as const, country_code: 'RU', city: 'Kazan', inherited: false },
}

describe('CatalogCard', () => {
  it('marks a meetup with a diamond and a hackathon with a bar', () => {
    const { unmount } = renderWithProviders(
      <CatalogCard event={base} layout="list" selected={false} onSelect={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.HACKATHON'))).toBeInTheDocument()
    unmount()

    renderWithProviders(
      <CatalogCard
        event={{ ...base, kind: 'MEETUP' }}
        layout="list"
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    const mark = screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP'))
    expect(mark).toBeInTheDocument()
    expect(mark.previousElementSibling?.className).toContain('rotate-45')
  })

  it('shows the derived format rather than the declared one', () => {
    renderWithProviders(
      <CatalogCard
        event={{ ...base, effective_format: 'HYBRID', offline_stages: [kazanFinal] }}
        layout="list"
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText(i18n.t('event:place.format.HYBRID'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:place.format.ONLINE'))).not.toBeInTheDocument()
  })

  it('shows the in-person final and the prize pool only in the tile layout', () => {
    const event = {
      ...base,
      effective_format: 'HYBRID' as const,
      offline_stages: [kazanFinal],
      prize_pool: '500000.00',
      prize_currency: 'RUB',
    }

    const { unmount } = renderWithProviders(
      <CatalogCard event={event} layout="list" selected={false} onSelect={vi.fn()} />,
    )
    expect(screen.queryByText(/Kazan/)).not.toBeInTheDocument()
    unmount()

    renderWithProviders(
      <CatalogCard event={event} layout="grid" selected={false} onSelect={vi.fn()} />,
    )
    expect(screen.getByText(/Kazan/)).toBeInTheDocument()
    expect(screen.getByText(/500000\.00 RUB/)).toBeInTheDocument()
  })

  it('reports participation and reports the selection back', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithProviders(
      <CatalogCard
        event={{ ...base, joined: true }}
        layout="list"
        selected={false}
        onSelect={onSelect}
      />,
    )
    expect(screen.getByText(i18n.t('event:catalog.joined'))).toBeInTheDocument()

    await user.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledWith('e1')
  })
})
