import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fromCatalogEvent } from '@/features/event-overlay-card'
import { EventOverlayBody } from '@/features/event-overlay-card/event-overlay-body'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

vi.mock('@/features/personal-layer', () => ({ PersonalSummary: () => null }))
vi.mock('@/features/event-overlay-card/team-progress/team-progress-bar', () => ({
  TeamProgressBar: () => null,
}))

const catalogEvent: CatalogEvent = {
  id: 'ev_gma9hq8a96q5',
  title: 'Into the Scrape-Verse',
  kind: 'HACKATHON',
  format: 'HYBRID',
  origin: 'WORLD',
  effective_format: 'HYBRID',
  start_at: '2026-11-01T09:00:00Z',
  end_at: '2026-11-03T18:00:00Z',
  state: 'UPCOMING',
  joined: false,
  offline_stages: [],
  prize_pool: '15000.00',
  prize_currency: 'USD',
  team_size_min: 1,
  team_size_max: 4,
  tracks: [
    { id: 'tr_one', track_no: 1, name: 'Self-healing web scraping', prize_total: '8500' },
    { id: 'tr_two', track_no: 2, name: 'Structured extraction at scale', prize_total: '5500' },
  ],
}

function renderOverlay(event: CatalogEvent = catalogEvent) {
  return renderWithProviders(
    <EventOverlayBody card={fromCatalogEvent(event)} canOpenAdmin={false} />,
  )
}

describe('the card opened from the catalog states what the catalog row states', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('names the prize pool the row shows', () => {
    renderOverlay()
    expect(screen.getByText('$15,000')).toBeTruthy()
  })

  it('names the format the row shows', () => {
    renderOverlay()
    expect(screen.getByText(i18n.t('event:place.format.HYBRID'))).toBeTruthy()
  })

  it('names every track of the event', () => {
    renderOverlay()
    expect(screen.getByText('Self-healing web scraping')).toBeTruthy()
    expect(screen.getByText('Structured extraction at scale')).toBeTruthy()
  })

  it('states the team size the event allows', () => {
    renderOverlay()
    expect(screen.getByText(i18n.t('event:place.teamRange', { min: 1, max: 4 }))).toBeTruthy()
  })

  it('states no prize pool when the event declares none', () => {
    renderOverlay({ ...catalogEvent, prize_pool: undefined, prize_currency: undefined })
    expect(screen.queryByText('$15,000')).toBeNull()
  })
})
