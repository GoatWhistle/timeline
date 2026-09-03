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
  it('names the kind in text rather than by shape alone', () => {
    const { unmount } = renderWithProviders(
      <CatalogCard event={base} selected={false} onSelect={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.HACKATHON'))).toBeInTheDocument()
    unmount()

    renderWithProviders(
      <CatalogCard event={{ ...base, kind: 'MEETUP' }} selected={false} onSelect={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:catalog.kindLabel.HACKATHON'))).not.toBeInTheDocument()
  })

  it('shows the derived format rather than the declared one', () => {
    renderWithProviders(
      <CatalogCard
        event={{ ...base, effective_format: 'HYBRID', offline_stages: [kazanFinal] }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText(i18n.t('event:place.format.HYBRID'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:place.format.ONLINE'))).not.toBeInTheDocument()
  })

  it('shows the in-person final and the prize as a currency symbol, not a code', () => {
    const event = {
      ...base,
      effective_format: 'HYBRID' as const,
      offline_stages: [kazanFinal],
      prize_pool: '500000.00',
      prize_currency: 'RUB',
    }

    renderWithProviders(<CatalogCard event={event} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText(/Kazan/)).toBeInTheDocument()
    expect(screen.getByText('500,000 ₽')).toBeInTheDocument()
    expect(screen.queryByText(/RUB/)).not.toBeInTheDocument()
    expect(screen.queryByText(/500000\.00/)).not.toBeInTheDocument()
  })

  it('leads the amount with the symbol for a currency that is written that way', () => {
    renderWithProviders(
      <CatalogCard
        event={{ ...base, prize_pool: '15000.00', prize_currency: 'USD' }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('$15,000')).toBeInTheDocument()
  })

  it('reports participation in words, not by colour alone, and reports the selection back', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithProviders(
      <CatalogCard event={{ ...base, joined: true }} selected={false} onSelect={onSelect} />,
    )
    expect(screen.getAllByText(i18n.t('event:catalog.joined')).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledWith('e1')
  })

  it('says nothing about participation when the viewer does not take part', () => {
    renderWithProviders(<CatalogCard event={base} selected={false} onSelect={vi.fn()} />)
    expect(screen.queryByText(i18n.t('event:catalog.joined'))).not.toBeInTheDocument()
  })

  it('uses the fields that used to be wasted', () => {
    renderWithProviders(
      <CatalogCard
        event={{
          ...base,
          organizer: 'Organising committee',
          track: 'Smart city',
          team_size_min: 3,
          team_size_max: 5,
        }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Organising committee')).toBeInTheDocument()
    expect(screen.getByText('Smart city')).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('event:catalog.card.teamRange', { min: 3, max: 5 })),
    ).toBeInTheDocument()
  })

  it('keeps the website link out of the option, so no button nests inside a button', () => {
    renderWithProviders(
      <CatalogCard
        event={{ ...base, website_url: 'https://example.com' }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    const option = screen.getByRole('option')
    const link = screen.getByRole('link', {
      name: i18n.t('event:catalog.card.websiteOf', { title: base.title }),
    })
    expect(link).toBeInTheDocument()
    expect(option.contains(link)).toBe(false)
    expect(option.querySelector('a, button')).toBeNull()
  })

  it('sets the title above the prize in the type scale, since it is the primary thing', () => {
    const { container } = renderWithProviders(
      <CatalogCard
        event={{ ...base, prize_pool: '15000.00', prize_currency: 'USD' }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    const title = screen.getByText(base.title)
    const prize = screen.getByText('$15,000')

    expect(title.className).toContain('text-screen')
    expect(prize.className).toContain('text-heading')

    const spoken = [...container.querySelectorAll('.text-screen')].filter(
      (node) => node.getAttribute('aria-hidden') !== 'true',
    )
    expect(spoken).toEqual([title])
  })

  it('paints the prize in the prize colour rather than the muted one it used to wear', () => {
    renderWithProviders(
      <CatalogCard
        event={{ ...base, prize_pool: '15000.00', prize_currency: 'USD' }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    const prize = screen.getByText('$15,000')

    expect(prize.className).toContain('text-prize')
    expect(prize.className).not.toContain('text-muted-foreground')
  })

  it('leaves the cover out of the accessible name, since it is decoration', () => {
    const { container } = renderWithProviders(
      <CatalogCard
        event={{ ...base, cover_url: '/api/v1/covers/abc.png' }}
        selected={false}
        onSelect={vi.fn()}
      />,
    )
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('loading')).toBe('lazy')
  })
})
