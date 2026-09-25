import { describe, expect, it } from 'vitest'
import { canArchive, canPublish } from '@/features/event-list/admin/moderation-menu'
import type { EventResponse } from '@/shared/api/types.gen'

function event(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'ev_1',
    title: 'Event',
    kind: 'HACKATHON',
    origin: 'WORLD',
    format: 'ONLINE',
    effective_format: 'ONLINE',
    state: 'UPCOMING',
    start_at: '2026-10-01T00:00:00Z',
    end_at: '2026-10-02T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    tracks: [],
    ...overrides,
  } as EventResponse
}

describe('the list offers only the moderation the domain allows', () => {
  it('publishes a draft, which is the only state publishing accepts', () => {
    expect(canPublish(event())).toBe(true)
  })

  it('never offers to publish an event that is already published', () => {
    expect(canPublish(event({ published_at: '2026-09-02T00:00:00Z' }))).toBe(false)
  })

  it('never offers to publish an archived event, which the server refuses', () => {
    expect(canPublish(event({ archived_at: '2026-09-03T00:00:00Z' }))).toBe(false)
  })

  it('never offers to publish an event archived after it was published', () => {
    expect(
      canPublish(
        event({ published_at: '2026-09-02T00:00:00Z', archived_at: '2026-09-03T00:00:00Z' }),
      ),
    ).toBe(false)
  })

  it('archives a draft and a published event alike', () => {
    expect(canArchive(event())).toBe(true)
    expect(canArchive(event({ published_at: '2026-09-02T00:00:00Z' }))).toBe(true)
  })

  it('never offers to archive twice, because the archive is terminal', () => {
    expect(canArchive(event({ archived_at: '2026-09-03T00:00:00Z' }))).toBe(false)
  })
})
