import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EventPlaceSummary } from '@/features/event-card/event-place-summary'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'
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

function stage(overrides: Partial<StageResponse>): StageResponse {
  return {
    id: 's1',
    event_id: 'e1',
    name: 'Final',
    type: 'DEMO',
    start_at: '2026-10-15T00:00:00Z',
    end_at: '2026-10-16T00:00:00Z',
    sort_order: 1,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    place: { format: 'ONLINE', inherited: true },
    ...overrides,
  }
}

const kazanFinal = stage({
  format: 'OFFLINE',
  country_code: 'RU',
  city: 'Kazan',
  place: { format: 'OFFLINE', country_code: 'RU', city: 'Kazan', inherited: false },
})

describe('EventPlaceSummary', () => {
  it('shows the in-person stage with its city and date', () => {
    renderWithProviders(
      <EventPlaceSummary event={{ ...base, effective_format: 'HYBRID' }} stages={[kazanFinal]} />,
    )
    expect(screen.getByText(/Kazan/)).toBeInTheDocument()
    expect(screen.getByText(/Final/)).toBeInTheDocument()
  })

  it('explains the format when it is derived from the stages', () => {
    renderWithProviders(
      <EventPlaceSummary event={{ ...base, effective_format: 'HYBRID' }} stages={[kazanFinal]} />,
    )
    expect(screen.getByText(i18n.t('event:place.derivedHint'))).toBeInTheDocument()
  })

  it('stays quiet when the declared and the derived format agree', () => {
    renderWithProviders(<EventPlaceSummary event={base} stages={[stage({})]} />)
    expect(screen.queryByText(i18n.t('event:place.derivedHint'))).not.toBeInTheDocument()
  })

  it('lists no in-person line for a fully online event', () => {
    renderWithProviders(<EventPlaceSummary event={base} stages={[stage({})]} />)
    expect(screen.queryByText(/Kazan/)).not.toBeInTheDocument()
  })

  it('leaves the money and the team size to the facts panel', () => {
    renderWithProviders(
      <EventPlaceSummary
        event={{
          ...base,
          effective_format: 'HYBRID',
          prize_pool: '500000.00',
          prize_currency: 'RUB',
          team_size_max: 5,
        }}
        stages={[kazanFinal]}
      />,
    )
    expect(screen.queryByText(/500000\.00/)).not.toBeInTheDocument()
    expect(screen.queryByText(/RUB/)).not.toBeInTheDocument()
  })

  it('renders nothing when the format is plain and no stage is in person', () => {
    const { container } = renderWithProviders(
      <EventPlaceSummary event={base} stages={[stage({})]} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
