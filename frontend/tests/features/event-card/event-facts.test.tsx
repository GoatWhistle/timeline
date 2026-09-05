import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EventFacts } from '@/features/event-card/event-facts'
import { FIGURE_LIMIT, figureSlots, teamSizeRange } from '@/features/event-card/team-size-figures'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { i18n } from '@/shared/i18n/config'

const base: EventResponse = {
  id: 'e1',
  title: 'National AI Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'RU',
  effective_format: 'ONLINE',
  start_at: '2026-10-01T00:00:00Z',
  end_at: '2026-10-20T00:00:00Z',
  state: 'UPCOMING',
  tracks: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

function prizeText(): string {
  const label = screen.getByText(i18n.t('event:place.prizePoolShort'))
  const value = label.parentElement?.querySelector('dd')
  if (!value) throw new Error('no prize value')
  return value.textContent ?? ''
}

describe('the prize pool is money, not a raw decimal', () => {
  it('drops the kopecks entirely', () => {
    renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '500000.00', prize_currency: 'RUB' }} />,
    )
    expect(prizeText()).not.toContain('.00')
    expect(prizeText()).not.toContain('500000.00')
  })

  it('separates the thousands so the amount is readable', () => {
    renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '500000.00', prize_currency: 'RUB' }} />,
    )
    expect(prizeText()).toContain('500,000')
  })

  it('puts the rouble sign after the amount', () => {
    renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '500000', prize_currency: 'RUB' }} />,
    )
    expect(prizeText().trim()).toBe('500,000 ₽')
  })

  it('puts the dollar sign before the amount', () => {
    renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '10000', prize_currency: 'USD' }} />,
    )
    expect(prizeText().trim()).toBe('$10,000')
  })

  it('puts the pound sign before and the euro sign after', () => {
    const { unmount } = renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '2500', prize_currency: 'GBP' }} />,
    )
    expect(prizeText().trim()).toBe('£2,500')
    unmount()

    renderWithProviders(
      <EventFacts event={{ ...base, prize_pool: '2500', prize_currency: 'EUR' }} />,
    )
    expect(prizeText().trim()).toBe('2,500 €')
  })

  it('shows no prize row at all when the event has none', () => {
    renderWithProviders(<EventFacts event={base} />)
    expect(screen.queryByText(i18n.t('event:place.prizePoolShort'))).not.toBeInTheDocument()
  })
})

describe('the website link names the host it goes to', () => {
  it('shows the host rather than a generic word', () => {
    renderWithProviders(
      <EventFacts event={{ ...base, website_url: 'https://lablab.ai/ai-hackathons/voice' }} />,
    )
    const link = screen.getByRole('link')
    expect(link.textContent?.trim()).toBe('lablab.ai')
    expect(link.textContent).not.toContain('/ai-hackathons/voice')
    expect(link).toHaveAttribute('href', 'https://lablab.ai/ai-hackathons/voice')
  })

  it('opens in a new tab without leaking the referrer', () => {
    renderWithProviders(<EventFacts event={{ ...base, website_url: 'https://example.org/x' }} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('the team size is drawn as figures', () => {
  function figures(): SVGElement[] {
    const label = screen.getByText(i18n.t('event:place.teamSize'))
    const value = label.parentElement?.querySelector('dd')
    if (!value) throw new Error('no team size value')
    return [...value.querySelectorAll('svg')]
  }

  it('draws one figure per person of the maximum', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 1, team_size_max: 4 }} />)
    expect(figures()).toHaveLength(4)
  })

  it('names the range for a screen reader instead of relying on the drawing', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 1, team_size_max: 4 }} />)
    expect(
      screen.getByText(i18n.t('event:place.teamRange', { min: 1, max: 4 })),
    ).toBeInTheDocument()
  })

  it('says the exact size when the minimum equals the maximum', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 3, team_size_max: 3 }} />)
    expect(screen.getByText(i18n.t('event:place.teamExact', { size: 3 }))).toBeInTheDocument()
    expect(figures()).toHaveLength(3)
  })

  it('stops drawing figures past the limit and shows the numbers instead', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 2, team_size_max: 40 }} />)
    expect(figures().length).toBeLessThanOrEqual(FIGURE_LIMIT)
    const label = screen.getByText(i18n.t('event:place.teamSize'))
    const value = label.parentElement?.querySelector('dd')
    expect(value?.textContent).toContain('2–40')
  })

  it('shows no team row when the event states no size', () => {
    renderWithProviders(<EventFacts event={base} />)
    expect(screen.queryByText(i18n.t('event:place.teamSize'))).not.toBeInTheDocument()
  })

  it('marks the guaranteed members apart from the optional ones', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 2, team_size_max: 5 }} />)
    const drawn = figures()
    const faint = drawn.filter((svg) =>
      (svg.getAttribute('class') ?? '').includes('text-faint-foreground'),
    )
    expect(drawn).toHaveLength(5)
    expect(faint).toHaveLength(3)
  })

  it('draws every figure alike when the size is exact', () => {
    renderWithProviders(<EventFacts event={{ ...base, team_size_min: 3, team_size_max: 3 }} />)
    const faint = figures().filter((svg) =>
      (svg.getAttribute('class') ?? '').includes('text-faint-foreground'),
    )
    expect(faint).toHaveLength(0)
  })
})

describe('figureSlots splits the range into guaranteed and optional places', () => {
  it('marks only the places past the minimum as optional', () => {
    expect(figureSlots({ min: 2, max: 5 })).toEqual([
      { position: 1, optional: false },
      { position: 2, optional: false },
      { position: 3, optional: true },
      { position: 4, optional: true },
      { position: 5, optional: true },
    ])
  })

  it('marks nothing optional when the minimum equals the maximum', () => {
    expect(figureSlots({ min: 3, max: 3 }).every((slot) => !slot.optional)).toBe(true)
  })
})

describe('teamSizeRange fills in a half-stated range', () => {
  it('treats a lone maximum as a range starting at that maximum', () => {
    expect(teamSizeRange(undefined, 4)).toEqual({ min: 4, max: 4 })
  })

  it('treats a lone minimum the same way', () => {
    expect(teamSizeRange(2, undefined)).toEqual({ min: 2, max: 2 })
  })

  it('refuses a range that runs backwards', () => {
    expect(teamSizeRange(5, 2)).toBeNull()
  })

  it('refuses a size below one person', () => {
    expect(teamSizeRange(0, 4)).toBeNull()
  })

  it('is absent when the event states nothing', () => {
    expect(teamSizeRange(undefined, undefined)).toBeNull()
  })
})

describe('the facts panel carries the event basics', () => {
  it('states the effective format', () => {
    renderWithProviders(<EventFacts event={base} />)
    const label = screen.getByText(i18n.t('event:place.effective'))
    const value = label.parentElement?.querySelector('dd')
    expect(
      within(value as HTMLElement).getByText(i18n.t('event:place.format.ONLINE')),
    ).toBeInTheDocument()
  })

  it('counts the tracks instead of listing them a second time', () => {
    renderWithProviders(
      <EventFacts
        event={{
          ...base,
          tracks: [
            { id: 'tr_1', track_no: 1, name: 'Smart city', prize_total: '3000' },
            { id: 'tr_2', track_no: 2, name: 'Voice agents', prize_total: '2000' },
          ],
        }}
      />,
    )
    expect(screen.getByText(i18n.t('event:card.trackCount', { count: 2 }))).toBeInTheDocument()
    expect(screen.queryByText('Smart city')).not.toBeInTheDocument()
    expect(screen.queryByText('Voice agents')).not.toBeInTheDocument()
  })

  it('states the period the header no longer carries', () => {
    renderWithProviders(<EventFacts event={base} />)
    const label = screen.getByText(i18n.t('event:place.period'))
    const value = label.parentElement?.querySelector('dd')
    expect(value?.textContent).toBe(formatDateRange(base.start_at, base.end_at))
  })

  it('states the organizer the header no longer carries', () => {
    renderWithProviders(<EventFacts event={{ ...base, organizer: 'Northwind Labs' }} />)
    const label = screen.getByText(i18n.t('event:place.organizer'))
    const value = label.parentElement?.querySelector('dd')
    expect(value?.textContent).toBe('Northwind Labs')
  })

  it('draws no organizer row when the event names none', () => {
    renderWithProviders(<EventFacts event={base} />)
    expect(screen.queryByText(i18n.t('event:place.organizer'))).not.toBeInTheDocument()
  })
})
