import type { EventResponse, Place, StageResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'

export function resolvePlace(event: EventResponse, stage: Partial<StageResponse>): Place {
  if (!stage.format) {
    return {
      format: event.format,
      country_code: event.country_code,
      city: event.city,
      venue: stage.venue,
      online_url: stage.online_url,
      inherited: true,
    }
  }
  const offline = stage.format !== 'ONLINE'
  return {
    format: stage.format,
    country_code: offline ? (stage.country_code ?? event.country_code) : undefined,
    city: offline ? (stage.city ?? event.city) : undefined,
    venue: stage.venue,
    online_url: stage.online_url,
    inherited: false,
  }
}

function stage(
  id: string,
  eventId: string,
  name: string,
  type: StageResponse['type'],
  startOffset: number,
  endOffset: number,
  sortOrder: number,
  place: Partial<StageResponse> = {},
): StageResponse {
  const event = events.find((item) => item.id === eventId)!
  return {
    id,
    event_id: eventId,
    name,
    type,
    start_at: at(startOffset),
    end_at: at(endOffset),
    sort_order: sortOrder,
    created_at: at(-60),
    updated_at: at(-60),
    ...place,
    place: resolvePlace(event, place),
  }
}

export const stages: StageResponse[] = [
  stage(
    'a1000000-0000-4000-8000-000000000001',
    events[0]!.id,
    'Registration',
    'REGISTRATION',
    0,
    10,
    1,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000002',
    events[0]!.id,
    'Application Review',
    'SELECTION',
    10,
    13,
    2,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000003',
    events[0]!.id,
    'Main Stage',
    'PARTICIPATION',
    14,
    20,
    3,
  ),
  stage('a1000000-0000-4000-8000-000000000004', events[0]!.id, 'Solution Demo', 'DEMO', 20, 21, 4, {
    format: 'OFFLINE',
    country_code: 'RU',
    city: 'Kazan',
    venue: 'IT Park',
  }),
  stage(
    'a2000000-0000-4000-8000-000000000001',
    events[1]!.id,
    'Registration',
    'REGISTRATION',
    -20,
    -3,
    1,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000002',
    events[1]!.id,
    'Development',
    'PARTICIPATION',
    -2,
    4,
    2,
  ),
  stage('a2000000-0000-4000-8000-000000000003', events[1]!.id, 'Submission', 'SUBMISSION', 4, 5, 3),
  stage(
    'a3000000-0000-4000-8000-000000000001',
    events[2]!.id,
    'Main Stage',
    'PARTICIPATION',
    -60,
    -42,
    1,
  ),
  stage('a3000000-0000-4000-8000-000000000002', events[2]!.id, 'Results', 'RESULTS', -41, -40, 2),
]
