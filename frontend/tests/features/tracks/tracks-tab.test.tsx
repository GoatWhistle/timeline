import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventResponse, EventTrackListResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const state: { data: EventTrackListResponse | undefined } = { data: undefined }

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: () => ({ data: state.data, isPending: false, isError: false }) }
})

vi.mock('@/features/tracks/track.queries', () => ({
  useCreateTrack: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTrack: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTrack: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const { TracksTab } = await import('@/features/tracks/tracks-tab')

function event(kind: EventResponse['kind']): EventResponse {
  return {
    id: 'ev_gma9hq8a96q5',
    title: 'National hackathon',
    kind,
    state: 'PUBLISHED',
    start_at: '2026-06-01T09:00:00Z',
    end_at: '2026-06-03T18:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as unknown as EventResponse
}

const POOL: EventTrackListResponse = {
  items: [
    {
      id: 'tr_one',
      event_id: 'ev_gma9hq8a96q5',
      track_no: 1,
      name: 'Smart city',
      description: 'Trace a relationship across many hops.',
      prize_total: '300000',
      prizes: [{ id: 'pz_1', place: 1, amount: '200000' }],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  prize_pool: '500000',
  prize_currency: 'RUB',
  distributed: '300000',
  unallocated: '200000',
}

describe('tracks belong to a hackathon and to nothing else', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    state.data = POOL
  })

  it('a meetup is told tracks do not apply and gets no add control', () => {
    renderWithProviders(<TracksTab event={event('MEETUP')} />)
    expect(screen.getByText(i18n.t('event:tracks.hackathonOnly'))).toBeTruthy()
    expect(screen.queryByRole('button', { name: i18n.t('event:tracks.add') })).toBeNull()
  })

  it('a hackathon gets the add control', () => {
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    expect(
      screen.getAllByRole('button', { name: i18n.t('event:tracks.add') }).length,
    ).toBeGreaterThan(0)
  })
})

describe('the unallocated remainder is on screen, not inferred', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    state.data = POOL
  })

  it('names the pool, what is distributed and what is left', () => {
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    const budget = screen.getByRole('region', { name: i18n.t('event:tracks.budgetTitle') })
    expect(budget.textContent).toContain('500,000')
    expect(budget.textContent).toContain('300,000')
    expect(budget.textContent).toContain('200,000')
  })

  it('the remainder is labelled as unallocated', () => {
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    const term = screen.getByText(i18n.t('event:place.prizeUnallocated'))
    expect(term.nextElementSibling?.textContent).toContain('200,000')
  })

  it('the meter reports the distributed share', () => {
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    const meter = screen.getByRole('progressbar', { name: i18n.t('event:tracks.budgetMeter') })
    expect(meter.getAttribute('aria-valuenow')).toBe('60')
  })

  it('says the pool is missing rather than showing an empty remainder', () => {
    state.data = { items: [], distributed: '0' } as unknown as EventTrackListResponse
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    expect(screen.getByText(i18n.t('event:tracks.noPool'))).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})

describe('an over-budget split is refused before it is sent', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    state.data = POOL
  })

  it('names the overshoot and blocks the submit once the amounts exceed what is left', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TracksTab event={event('HACKATHON')} />)
    const [add] = screen.getAllByRole('button', { name: i18n.t('event:tracks.add') })
    if (!add) throw new Error('the add control is missing')
    await user.click(add)

    await user.type(screen.getByLabelText(i18n.t('event:tracks.formName')), 'Green energy')
    await user.click(screen.getByRole('button', { name: i18n.t('event:tracks.formPrizeAdd') }))
    await user.type(screen.getByLabelText(i18n.t('event:place.trackPlace', { place: 1 })), '300000')

    expect(screen.getByRole('alert').textContent).toContain('100,000')
    expect(screen.getByRole('button', { name: i18n.t('event:list.create') })).toHaveProperty(
      'disabled',
      true,
    )
  })
})
