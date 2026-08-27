import type { StageResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'

function stage(
  id: string,
  eventId: string,
  name: string,
  type: StageResponse['type'],
  startOffset: number,
  endOffset: number,
  sortOrder: number,
): StageResponse {
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
  }
}

export const stages: StageResponse[] = [
  stage(
    'a1000000-0000-4000-8000-000000000001',
    events[0]!.id,
    'Регистрация',
    'REGISTRATION',
    0,
    10,
    1,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000002',
    events[0]!.id,
    'Отбор заявок',
    'SELECTION',
    10,
    13,
    2,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000003',
    events[0]!.id,
    'Основной этап',
    'PARTICIPATION',
    14,
    20,
    3,
  ),
  stage('a1000000-0000-4000-8000-000000000004', events[0]!.id, 'Защита решений', 'DEMO', 20, 21, 4),
  stage(
    'a2000000-0000-4000-8000-000000000001',
    events[1]!.id,
    'Регистрация',
    'REGISTRATION',
    -20,
    -3,
    1,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000002',
    events[1]!.id,
    'Разработка',
    'PARTICIPATION',
    -2,
    4,
    2,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000003',
    events[1]!.id,
    'Сдача решения',
    'SUBMISSION',
    4,
    5,
    3,
  ),
  stage(
    'a3000000-0000-4000-8000-000000000001',
    events[2]!.id,
    'Основной этап',
    'PARTICIPATION',
    -60,
    -42,
    1,
  ),
  stage(
    'a3000000-0000-4000-8000-000000000002',
    events[2]!.id,
    'Результаты',
    'RESULTS',
    -41,
    -40,
    2,
  ),
]
