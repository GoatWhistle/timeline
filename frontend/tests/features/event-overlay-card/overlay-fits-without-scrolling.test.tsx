import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { EventOverlayBody } from '@/features/event-overlay-card/event-overlay-body'
import type { OverlayCard } from '@/features/event-overlay-card/overlay-model'
import { i18n } from '@/shared/i18n/config'

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Northwind Voice Agents Sprint',
  organizer: 'Northwind Labs',
  description: 'A month-long build on a hosted speech stack.',
  websiteUrl: 'https://example.org/sprint',
  coverUrl: null,
  color: { family: 'RU', slot: 4 },
  state: 'ACTIVE',
  startAt: '2026-09-01T09:00:00Z',
  endAt: '2026-10-01T18:00:00Z',
  deadlineAt: '2026-09-25T18:00:00Z',
  status: 'DONE',
  facts: {
    effectiveFormat: 'ONLINE',
    prizePool: '10000',
    prizeCurrency: 'USD',
    teamSizeMin: 1,
    teamSizeMax: 5,
    tracks: [
      { id: 'tr_1', track_no: 1, name: 'Voice agents', prize_total: '7000' },
      { id: 'tr_2', track_no: 2, name: 'Telephony integration', prize_total: '3000' },
    ],
  },
  stages: [
    {
      id: 'st_1',
      name: 'Call for applications',
      type: 'REGISTRATION',
      start_at: '2026-09-01T09:00:00Z',
      end_at: '2026-09-25T18:00:00Z',
    },
  ],
  joined: true,
}

function render(overrides: Partial<OverlayCard> = {}) {
  return renderWithProviders(
    <EventOverlayBody card={{ ...card, ...overrides }} canOpenAdmin={false} />,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the small card keeps only what a small card can hold', () => {
  it('keeps the name, the cover, the description and the dates', () => {
    const { container } = render()
    expect(screen.getByText(card.description as string)).toBeInTheDocument()
    expect(container.querySelector('[data-event-color]')).not.toBeNull()
  })

  it('states the format, the prize pool and the team size', () => {
    render()
    expect(screen.getByText(i18n.t('event:place.format.ONLINE'))).toBeInTheDocument()
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('event:place.teamRange', { min: 1, max: 5 })),
    ).toBeInTheDocument()
  })

  it('names the tracks with the prize fund of each', () => {
    render()
    expect(screen.getByText('Voice agents')).toBeInTheDocument()
    expect(screen.getByText('$7,000')).toBeInTheDocument()
    expect(screen.getByText('Telephony integration')).toBeInTheDocument()
    expect(screen.getByText('$3,000')).toBeInTheDocument()
  })

  it('leaves the places inside a track to the full page', () => {
    const { container } = render()
    expect(container.querySelector('[data-prize-rank]')).toBeNull()
    expect(screen.queryByText(i18n.t('event:place.rankGold'))).toBeNull()
  })

  it('leaves the list of stages to the full page', () => {
    render()
    expect(screen.queryByText(i18n.t('event:detail.stages'))).toBeNull()
    expect(screen.queryByText('Call for applications')).toBeNull()
  })

  it('leaves the registration deadline and its urgency to the full page', () => {
    render()
    expect(screen.queryByText(i18n.t('event:detail.registration'))).toBeNull()
  })

  it('leaves the status and the team progress to the full page', () => {
    render()
    expect(screen.queryByText(i18n.t('event:detail.status'))).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})

describe('the card ends with a way out, and the website is an icon', () => {
  it('offers the full page of the event', () => {
    render()
    const link = screen.getByRole('link', { name: i18n.t('event:overlay.openFull') })
    expect(link).toHaveAttribute('href', `/events/${card.id}`)
  })

  it('reaches the website by an icon rather than by a worded button', () => {
    render()
    const site = screen.getByRole('link', { name: i18n.t('event:card.website') })
    expect(site).toHaveAttribute('href', card.websiteUrl)
    expect(site.querySelector('svg')).not.toBeNull()
    expect(site.textContent?.trim()).toBe('')
  })

  it('draws no website control when the event names no site', () => {
    render({ websiteUrl: null })
    expect(screen.queryByRole('link', { name: i18n.t('event:card.website') })).toBeNull()
  })
})
