import { describe, expect, it } from 'vitest'
import { distinctTeamNames, groupEventsByYear } from '@/features/public-profile/event-year-groups'
import type { PublicProfileEvent } from '@/shared/api/types.gen'

function event(overrides: Partial<PublicProfileEvent>): PublicProfileEvent {
  return {
    id: 'ev_1',
    title: 'Event',
    kind: 'HACKATHON',
    role: 'participant',
    start_at: '2025-01-01T00:00:00Z',
    end_at: '2025-01-02T00:00:00Z',
    ...overrides,
  } as PublicProfileEvent
}

describe('groupEventsByYear', () => {
  it('groups events by the year of start_at', () => {
    const events = [
      event({ id: 'a', start_at: '2025-03-01T00:00:00Z' }),
      event({ id: 'b', start_at: '2026-01-01T00:00:00Z' }),
      event({ id: 'c', start_at: '2025-06-01T00:00:00Z' }),
    ]
    const groups = groupEventsByYear(events)
    expect(groups.map((g) => g.year)).toEqual([2026, 2025])
    expect(groups[1]?.events.map((e) => e.id)).toEqual(['c', 'a'])
  })

  it('orders events within a year newest first', () => {
    const events = [
      event({ id: 'early', start_at: '2025-01-01T00:00:00Z' }),
      event({ id: 'late', start_at: '2025-11-01T00:00:00Z' }),
    ]
    const groups = groupEventsByYear(events)
    expect(groups[0]?.events.map((e) => e.id)).toEqual(['late', 'early'])
  })

  it('returns nothing for an empty list', () => {
    expect(groupEventsByYear([])).toEqual([])
  })
})

describe('distinctTeamNames', () => {
  it('collects unique team names, skipping events without one', () => {
    const events = [
      event({ team_name: 'Rocket Goats' }),
      event({ team_name: 'Rocket Goats' }),
      event({ team_name: 'Byte Wolves' }),
      event({}),
    ]
    expect(distinctTeamNames(events)).toEqual(['Rocket Goats', 'Byte Wolves'])
  })

  it('returns an empty list when no event has a team', () => {
    expect(distinctTeamNames([event({}), event({})])).toEqual([])
  })
})
