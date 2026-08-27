import type { EventResponse, EventState } from '@/shared/api/types.gen'
import { at } from './clock'

function event(
  id: string,
  title: string,
  startOffset: number,
  endOffset: number,
  overrides: Partial<EventResponse> = {},
): EventResponse {
  return {
    id,
    title,
    start_at: at(startOffset),
    end_at: at(endOffset),
    state: 'UPCOMING',
    created_at: at(-60),
    updated_at: at(-5),
    published_at: at(-50),
    ...overrides,
  }
}

export const events: EventResponse[] = [
  event('11111111-1111-4111-8111-111111111111', 'Всероссийский хакатон по ИИ', 14, 21, {
    organizer: 'Цифровая экономика',
    website_url: 'https://example.com/ai-hack',
    description: 'Соревнование команд по прикладным задачам машинного обучения.',
    notes: 'Контактное лицо со стороны организаторов — Смирнов.',
  }),
  event('22222222-2222-4222-8222-222222222222', 'Финтех-марафон', -2, 5, {
    organizer: 'Банк Развития',
    website_url: 'https://example.com/fintech',
    description: 'Разработка сервисов для малого бизнеса.',
  }),
  event('33333333-3333-4333-8333-333333333333', 'Событие умного города', -60, -40, {
    organizer: 'Департамент транспорта',
    description: 'Задачи городской инфраструктуры.',
  }),
  event('44444444-4444-4444-8444-444444444444', 'Внутренний хакатон платформы', 30, 33, {
    organizer: 'Внутренний',
    published_at: undefined,
    notes: 'Черновик, даты уточняются.',
  }),
  event('55555555-5555-4555-8555-555555555555', 'Событие 2025 года', -400, -395, {
    organizer: 'Прошлый год',
    archived_at: at(-380),
  }),
]

export function eventState(item: EventResponse): EventState {
  if (item.archived_at) return 'ARCHIVED'
  if (!item.published_at) return 'UNPUBLISHED'
  const current = Date.now()
  if (current < Date.parse(item.start_at)) return 'UPCOMING'
  if (current > Date.parse(item.end_at)) return 'FINISHED'
  return 'ACTIVE'
}

export function withState(item: EventResponse): EventResponse {
  return { ...item, state: eventState(item) }
}
