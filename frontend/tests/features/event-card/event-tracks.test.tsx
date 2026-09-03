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
    expect(
      within(second).getByText(i18n.t('event:place.trackPlace', { place: 1 })),
    ).toBeInTheDocument()
    expect(within(second).queryByText(i18n.t('event:place.trackPlace', { place: 2 }))).toBeNull()
  })

  it('renders whole amounts with no fractional part anywhere', () => {
    const { container } = renderWithProviders(<EventTracks tracks={split} />)
    const money = [...container.querySelectorAll('.tabular-nums')].map((node) => node.textContent)
    expect(money.length).toBeGreaterThan(0)
    for (const value of money) {
      expect(value ?? '').not.toMatch(/[.,]\d{2}\b/)
    }
  })

  it('reports what is distributed and what is left of the pool', () => {
    renderWithProviders(<EventTracks tracks={split} />)
    expect(screen.getByText(i18n.t('event:place.prizeDistributed'))).toBeInTheDocument()
    expect(screen.getByText('$9,500')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:place.prizeUnallocated'))).toBeInTheDocument()
    expect(screen.getByText('$500')).toBeInTheDocument()
  })

  it('says so plainly when a hackathon declares no tracks', () => {
    renderWithProviders(
      <EventTracks tracks={{ ...split, items: [], distributed: '0', unallocated: '10000' }} />,
    )
    expect(screen.getByText(i18n.t('event:place.noTracks'))).toBeInTheDocument()
  })
})
