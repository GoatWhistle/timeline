import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EventTracks } from '@/features/event-card/event-tracks'
import type { EventTrackListResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const split: EventTrackListResponse = {
  prize_pool: '10000',
  prize_currency: 'USD',
  distributed: '9500',
  nominations: '0',
  unallocated: '500',
  items: [
    {
      id: 'tr_1',
      event_id: 'ev_1',
      track_no: 1,
      name: 'Investigation and risk',
      description: 'Trace a relationship across many hops.',
      prize_total: '4500',
      prizes: [
        { id: 'pz_1', place: 1, amount: '3000' },
        { id: 'pz_2', place: 2, amount: '1500' },
      ],
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'tr_2',
      event_id: 'ev_1',
      track_no: 2,
      name: 'Agentic AI',
      description: 'Let an agent choose its own traversals.',
      prize_total: '5000',
      prizes: [{ id: 'pz_3', place: 1, amount: '5000' }],
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ],
}

describe('the prize split is shown per track and per place', () => {
  it('names every track of the event, not only the first', () => {
    renderWithProviders(<EventTracks tracks={split} />)
    expect(screen.getByText('Investigation and risk')).toBeInTheDocument()
    expect(screen.getByText('Agentic AI')).toBeInTheDocument()
  })

  it('states each place of a track with its own amount', () => {
    renderWithProviders(<EventTracks tracks={split} />)
    expect(screen.getByText('$3,000')).toBeInTheDocument()
    expect(screen.getByText('$1,500')).toBeInTheDocument()
  })

  it('gives a track with fewer places exactly the places it has', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(2)
    const second = sections[1] as HTMLElement
    expect(within(second).getByText(i18n.t('event:place.rankGold'))).toBeInTheDocument()
    expect(within(second).queryByText(i18n.t('event:place.rankSilver'))).toBeNull()
  })

  it('renders whole amounts with no fractional part anywhere', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const money = [...container.querySelectorAll('.tabular-nums')].map((node) => node.textContent)
    expect(money.length).toBeGreaterThan(0)
    for (const value of money) {
      expect(value ?? '').not.toMatch(/[.,]\d{2}\b/)
    }
  })

  it('says so plainly when a hackathon declares no tracks', () => {
    renderWithProviders(
      <EventTracks tracks={{ ...split, items: [], distributed: '0', unallocated: '10000' }} />,
    )
    expect(screen.getByText(i18n.t('event:place.noTracks'))).toBeInTheDocument()
  })
})

describe('a track reads as one thing, not as a stack of captions', () => {
  it('gives each track its own panel with its own prize fund', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const first = container.querySelectorAll('section')[0] as HTMLElement
    expect(within(first).getByText(i18n.t('event:place.trackPrizeFund'))).toBeInTheDocument()
    expect(within(first).getByText('$4,500')).toBeInTheDocument()
    expect(within(first).queryByText('$5,000')).toBeNull()
  })

  it('names the track by its number rather than by a bare digit', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const first = container.querySelectorAll('section')[0] as HTMLElement
    expect(
      within(first).getByText(i18n.t('event:place.trackNumber', { number: 1 })),
    ).toBeInTheDocument()
  })

  it('keeps the track description inside the track it belongs to', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const first = container.querySelectorAll('section')[0] as HTMLElement
    expect(within(first).getByText('Trace a relationship across many hops.')).toBeInTheDocument()
  })
})

describe("the organiser's accounting stays off the participant card", () => {
  it('never reports what is distributed', () => {
    renderWithProviders(<EventTracks tracks={split} />)
    expect(screen.queryByText(i18n.t('event:place.prizeDistributed'))).toBeNull()
    expect(screen.queryByText('$9,500')).toBeNull()
  })

  it('never reports what is left unallocated', () => {
    renderWithProviders(<EventTracks tracks={split} />)
    expect(screen.queryByText(i18n.t('event:place.prizeUnallocated'))).toBeNull()
    expect(screen.queryByText('$500')).toBeNull()
  })
})

describe('the first three places read as medals, not as one number among many', () => {
  it('marks the first three places by their own rank', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const first = container.querySelectorAll('section')[0] as HTMLElement
    expect(within(first).getByText(i18n.t('event:place.rankGold'))).toBeInTheDocument()
    expect(within(first).getByText(i18n.t('event:place.rankSilver'))).toBeInTheDocument()
  })

  it('gives each rank its own colour so gold is not silver', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const gold = container.querySelector('[data-prize-rank="GOLD"]')
    const silver = container.querySelector('[data-prize-rank="SILVER"]')
    expect(gold?.className).toContain('text-medal-gold')
    expect(silver?.className).toContain('text-medal-silver')
    expect(gold?.className).not.toBe(silver?.className)
  })

  it('carries the rank in words and in an icon, not in colour alone', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const shapes = ['GOLD', 'SILVER'].map((rank) => {
      const mark = container.querySelector(`[data-prize-rank="${rank}"]`) as HTMLElement
      const icon = mark.querySelector('svg')
      expect(icon, rank).not.toBeNull()
      expect(mark.textContent ?? '', rank).not.toHaveLength(0)
      return (icon as SVGElement).innerHTML
    })
    expect(shapes[0]).not.toBe(shapes[1])
  })
})
