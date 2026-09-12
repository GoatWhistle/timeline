import { describe, expect, it } from 'vitest'
import { buildResults, type PaletteResult } from '@/features/command-palette/palette-results'
import type { CatalogEvent, TeamResponse } from '@/shared/api/types.gen'

function event(overrides: Partial<CatalogEvent>): CatalogEvent {
  return {
    id: 'ev_1',
    title: 'Timeline Hack',
    kind: 'HACKATHON',
    format: 'ONLINE',
    effective_format: 'ONLINE',
    origin: 'RU',
    joined: false,
    start_at: '2026-02-01T00:00:00Z',
    end_at: '2026-02-02T00:00:00Z',
    offline_stages: [],
    ...overrides,
  } as unknown as CatalogEvent
}

function team(overrides: Partial<TeamResponse>): TeamResponse {
  return {
    id: 'tm_1',
    name: 'Rocket Goats',
    is_lead: true,
    my_state: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    lead: {} as TeamResponse['lead'],
    ...overrides,
  } as unknown as TeamResponse
}

const PAGES = [{ item: { to: '/schedule', labelKey: '', icon: () => null }, label: 'Schedule' }]
const ADMIN_PAGES = [
  { item: { to: '/admin/users', labelKey: '', icon: () => null }, label: 'Users' },
]
const COMMANDS: PaletteResult[] = [
  { id: 'cmd-sidebar', section: 'commands', title: 'Toggle sidebar' },
]

function base() {
  return {
    events: [] as CatalogEvent[],
    teams: [] as TeamResponse[],
    pages: PAGES,
    adminPages: ADMIN_PAGES,
    commands: COMMANDS,
    recent: [],
  }
}

describe('buildResults', () => {
  it('shows only commands under the commands prefix', () => {
    const results = buildResults({ mode: 'commands', term: '', ...base() })
    expect(results).toEqual(COMMANDS)
  })

  it('shows only the caller teams under the teams prefix', () => {
    const results = buildResults({
      mode: 'teams',
      term: '',
      ...base(),
      teams: [team({})],
    })
    expect(results).toEqual([
      { id: 'team-tm_1', section: 'teams', title: 'Rocket Goats', path: '/teams/tm_1' },
    ])
  })

  it('filters admin pages by the typed term, admin prefix only', () => {
    const results = buildResults({ mode: 'admin', term: 'user', ...base() })
    expect(results).toEqual([
      { id: 'admin-/admin/users', section: 'admin', title: 'Users', path: '/admin/users' },
    ])
  })

  it('never returns an admin page under the plain pages prefix', () => {
    const results = buildResults({ mode: 'pages', term: '', ...base() })
    expect(results.every((result) => result.section !== 'admin')).toBe(true)
  })

  it('shows recent entries when smart mode has no term yet', () => {
    const results = buildResults({
      mode: 'smart',
      term: '',
      ...base(),
      recent: [{ id: 'ev_1', title: 'Timeline Hack', path: '/events/ev_1' }],
    })
    expect(results).toEqual([
      { id: 'recent-ev_1', section: 'recent', title: 'Timeline Hack', path: '/events/ev_1' },
    ])
  })

  it('groups smart-mode matches with events first', () => {
    const results = buildResults({
      mode: 'smart',
      term: 'sched',
      ...base(),
      events: [event({ title: 'Scheduling summit' })],
    })
    expect(results[0]?.section).toBe('events')
    expect(results.some((result) => result.section === 'pages')).toBe(true)
  })

  it('returns hackathon events tagged with the # hint', () => {
    const results = buildResults({
      mode: 'hackathons',
      term: '',
      ...base(),
      events: [event({})],
    })
    expect(results).toEqual([
      {
        id: 'event-ev_1',
        section: 'events',
        title: 'Timeline Hack',
        hint: '#',
        path: '/events/ev_1',
      },
    ])
  })
})
