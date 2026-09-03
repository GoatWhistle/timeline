import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamEventEntryResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const chosen = vi.fn()

vi.mock('@/features/tracks/track.queries', () => ({
  useChooseTrack: () => ({ mutateAsync: chosen, isPending: false }),
}))

const { TeamTrackPicker } = await import('@/features/tracks/team-track-picker')

const TRACKS = [
  { id: 'tr_one', track_no: 1, name: 'Smart city', prize_total: '300000' },
  { id: 'tr_two', track_no: 2, name: 'Green energy', prize_total: '150000' },
]

function entry(overrides: Partial<TeamEventEntryResponse> = {}): TeamEventEntryResponse {
  return {
    id: 'te_42ej2s5gh7e8',
    team_id: 'tm_42ej2s5gh7e8',
    event_id: 'ev_gma9hq8a96q5',
    event_title: 'National hackathon',
    entered_at: '2026-01-01T00:00:00Z',
    registered: false,
    registered_count: 0,
    roster: [],
    roster_size: 0,
    assigned_members: 0,
    tracks: TRACKS,
    track_locked: false,
    ...overrides,
  } as TeamEventEntryResponse
}

function renderPicker(over: Partial<TeamEventEntryResponse> = {}, isLead = true) {
  return renderWithProviders(
    <TeamTrackPicker teamId="tm_42ej2s5gh7e8" entry={entry(over)} isLead={isLead} />,
  )
}

describe('a team lead picks a track while the event has not started', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    chosen.mockClear()
  })

  it('offers a control listing every track of the event', () => {
    renderPicker()
    expect(screen.getByRole('combobox', { name: i18n.t('team:track.title') })).toBeTruthy()
  })

  it('says the choice is optional and changeable', () => {
    renderPicker()
    expect(screen.getByText(i18n.t('team:track.hint'))).toBeTruthy()
  })
})

describe('once the event starts the choice is stated, not offered', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows no control at all when the server reports the track locked', () => {
    renderPicker({ track_locked: true, track: TRACKS[0] })
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('names the chosen track as plain text instead', () => {
    renderPicker({ track_locked: true, track: TRACKS[0] })
    expect(screen.getByText('Smart city')).toBeTruthy()
  })

  it('says why the choice can no longer change', () => {
    renderPicker({ track_locked: true, track: TRACKS[0] })
    expect(screen.getByText(i18n.t('team:track.lockedHint'))).toBeTruthy()
    expect(screen.queryByText(i18n.t('team:track.hint'))).toBeNull()
  })

  it('a locked entry with no track still reads as no track rather than a control', () => {
    renderPicker({ track_locked: true })
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText(i18n.t('team:track.none'))).toBeTruthy()
  })
})

describe('only a team lead is offered the choice', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('a member sees the chosen track but no control', () => {
    renderPicker({ track: TRACKS[1] }, false)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText('Green energy')).toBeTruthy()
  })
})

describe('an event without tracks shows nothing', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders no section when the event declares no track', () => {
    const { container } = renderPicker({ tracks: [] })
    expect(container.querySelector('section')).toBeNull()
  })
})
