import type {
  CatalogEvent,
  EventCard,
  EventColor,
  EventResponse,
  EventState,
  StageType,
} from '@/shared/api/types.gen'

export type OverlayStage = {
  id: string
  name: string
  type: StageType
  start_at: string
  end_at: string
}

export type OverlayCard = {
  id: string
  title: string
  organizer: string | null
  description: string | null
  websiteUrl: string | null
  coverUrl: string | null
  color: EventColor | null
  state: EventState
  startAt: string
  endAt: string
  deadlineAt: string | null
  status: 'TODO' | 'DONE' | 'NOT_REQUIRED' | null
  stages: OverlayStage[]
  joined: boolean
}

export function fromEventCard(card: EventCard): OverlayCard {
  const { event, registration, registration_status: status } = card
  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer ?? null,
    description: event.description ?? null,
    websiteUrl: event.website_url ?? null,
    coverUrl: event.cover_url ?? null,
    color: event.color ?? null,
    state: event.state,
    startAt: event.start_at,
    endAt: event.end_at,
    deadlineAt: registration?.deadline_at ?? null,
    status: status?.status ?? null,
    stages: card.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      start_at: stage.start_at,
      end_at: stage.end_at,
    })),
    joined: true,
  }
}

export function fromCatalogEvent(event: CatalogEvent): OverlayCard {
  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer ?? null,
    description: event.description ?? null,
    websiteUrl: event.website_url ?? null,
    coverUrl: event.cover_url ?? null,
    color: event.color ?? null,
    state: event.state,
    startAt: event.start_at,
    endAt: event.end_at,
    deadlineAt: null,
    status: null,
    stages: event.offline_stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      start_at: stage.start_at,
      end_at: stage.end_at,
    })),
    joined: event.joined,
  }
}

export function fromEventResponse(event: EventResponse): OverlayCard {
  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer ?? null,
    description: event.description ?? null,
    websiteUrl: event.website_url ?? null,
    coverUrl: event.cover_url ?? null,
    color: event.color ?? null,
    state: event.state,
    startAt: event.start_at,
    endAt: event.end_at,
    deadlineAt: null,
    status: null,
    stages: [],
    joined: false,
  }
}
