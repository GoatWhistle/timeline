import { describe, expect, it } from 'vitest'
import { fromCatalogEvent, fromEventCard, fromEventResponse } from '@/features/event-overlay-card'
import type { CatalogEvent, EventCard } from '@/shared/api/types.gen'

const eventCard: EventCard = {
  can_mark_done: true,
  event: {
    id: 'ev_1',
    title: 'Assigned hackathon',
    kind: 'HACKATHON',
    format: 'ONLINE',
    origin: 'RU',
    effective_format: 'ONLINE',
    start_at: '2026-10-01T09:00:00Z',
    end_at: '2026-10-03T18:00:00Z',
    state: 'UPCOMING',
    tracks: [],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    color: { family: 'RU', slot: 4 },
    cover_url: '/api/v1/covers/a.png',
    organizer: 'Committee',
    website_url: 'https://example.com',
  },
  registration: {
    url: 'https://example.com/r',
    state: 'ACTIVE',
    deadline_at: '2026-09-20T00:00:00Z',
  },
  registration_status: { id: 'rs_1', status: 'TODO', todo_cycle: 1 },
  stages: [
    {
      id: 'st_1',
      event_id: 'ev_1',
      name: 'Final',
      type: 'RESULTS',
      start_at: '2026-10-02T09:00:00Z',
      end_at: '2026-10-03T18:00:00Z',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      format: 'ONLINE',
      sort_order: 1,
      place: { format: 'ONLINE', inherited: false },
    },
  ],
}

const catalogEvent: CatalogEvent = {
  id: 'ev_2',
  title: 'Open hackathon',
  tracks: [],
  kind: 'HACKATHON',
  format: 'OFFLINE',
  origin: 'WORLD',
  effective_format: 'OFFLINE',
  start_at: '2026-11-01T09:00:00Z',
  end_at: '2026-11-03T18:00:00Z',
  state: 'UPCOMING',
  joined: false,
  color: { family: 'WORLD', slot: 7 },
  cover_url: '/api/v1/covers/b.png',
  offline_stages: [
    {
      id: 'st_2',
      name: 'Onsite final',
      type: 'RESULTS',
      start_at: '2026-11-02T09:00:00Z',
      end_at: '2026-11-03T18:00:00Z',
      place: { city: 'Berlin', format: 'OFFLINE', inherited: false },
    },
  ],
}

describe('overlay model', () => {
  it('carries the cover, the colour and the deadline of an assigned event', () => {
    const card = fromEventCard(eventCard)

    expect(card.coverUrl).toBe('/api/v1/covers/a.png')
    expect(card.color).toEqual({ family: 'RU', slot: 4 })
    expect(card.deadlineAt).toBe('2026-09-20T00:00:00Z')
    expect(card.status).toBe('TODO')
    expect(card.joined).toBe(true)
    expect(card.stages.map((stage) => stage.name)).toEqual(['Final'])
  })

  it('carries the cover and the colour of a catalog event the viewer has not joined', () => {
    const card = fromCatalogEvent(catalogEvent)

    expect(card.coverUrl).toBe('/api/v1/covers/b.png')
    expect(card.color).toEqual({ family: 'WORLD', slot: 7 })
    expect(card.joined).toBe(false)
    expect(card.deadlineAt).toBeNull()
    expect(card.status).toBeNull()
    expect(card.stages.map((stage) => stage.name)).toEqual(['Onsite final'])
  })

  it('carries the cover and the colour of an event an administrator does not take part in', () => {
    const card = fromEventResponse(eventCard.event)

    expect(card.coverUrl).toBe('/api/v1/covers/a.png')
    expect(card.color).toEqual({ family: 'RU', slot: 4 })
    expect(card.title).toBe('Assigned hackathon')
    expect(card.joined).toBe(false)
    expect(card.deadlineAt).toBeNull()
    expect(card.status).toBeNull()
  })

  it('carries the deadline and the status a joined catalog event already answers with', () => {
    const card = fromCatalogEvent({
      ...catalogEvent,
      joined: true,
      registration_deadline: '2026-10-20T12:00:00Z',
      registration_status: { id: 'rs_2', status: 'TODO', todo_cycle: 1 },
    })

    expect(card.deadlineAt).toBe('2026-10-20T12:00:00Z')
    expect(card.status).toBe('TODO')
    expect(card.joined).toBe(true)
  })

  it('reads the colour from the API rather than deriving one', () => {
    expect(fromCatalogEvent({ ...catalogEvent, color: undefined }).color).toBeNull()
    expect(
      fromEventCard({ ...eventCard, event: { ...eventCard.event, color: undefined } }).color,
    ).toBeNull()
  })
})
