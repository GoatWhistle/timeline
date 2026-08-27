import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import type { EventState, StageType, TimelineResponse, TimelineRow } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

export function stageTypeText(type: StageType): string {
  return i18n.t(STAGE_TYPE_KEY[type])
}

export function eventStateText(state: EventState): string {
  return i18n.t(EVENT_STATE_KEY[state])
}

export const deadlineName = new RegExp(
  i18n.t('schedule.registrationDeadlineAria', { date: '' }).trim().replace(/\s+/g, '\\s+'),
)

export const timeline: TimelineResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    {
      event_id: 'e1',
      title: 'Зимний хакатон',
      state: 'ACTIVE',
      start_at: '2026-01-10T00:00:00Z',
      end_at: '2026-02-10T00:00:00Z',
      registration_deadline: '2026-01-20T00:00:00Z',
      team_role: 'Капитан',
      stages: [
        {
          id: 's1',
          name: 'Регистрация участников',
          type: 'REGISTRATION',
          start_at: '2026-01-10T00:00:00Z',
          end_at: '2026-01-20T00:00:00Z',
        },
        {
          id: 's2',
          name: 'Отбор заявок',
          type: 'SELECTION',
          start_at: '2026-01-18T00:00:00Z',
          end_at: '2026-02-01T00:00:00Z',
        },
      ],
    },
    {
      event_id: 'e2',
      title: 'Весенний митап',
      state: 'UPCOMING',
      start_at: '2026-03-01T00:00:00Z',
      end_at: '2026-03-02T00:00:00Z',
      stages: [],
    },
  ],
}

export const overlappingStages: TimelineRow['stages'] = [
  {
    id: 's1',
    name: 'Первый',
    type: 'REGISTRATION',
    start_at: '2026-01-10T00:00:00Z',
    end_at: '2026-02-20T00:00:00Z',
  },
  {
    id: 's2',
    name: 'Второй',
    type: 'SELECTION',
    start_at: '2026-01-15T00:00:00Z',
    end_at: '2026-02-25T00:00:00Z',
  },
  {
    id: 's3',
    name: 'Третий',
    type: 'DEMO',
    start_at: '2026-01-20T00:00:00Z',
    end_at: '2026-03-01T00:00:00Z',
  },
]

export function rowWith(stages: TimelineRow['stages']): TimelineResponse {
  return {
    range: timeline.range,
    rows: [
      {
        event_id: 'e1',
        title: 'Зимний хакатон',
        state: 'ACTIVE',
        start_at: '2026-01-10T00:00:00Z',
        end_at: '2026-03-10T00:00:00Z',
        stages,
      },
    ],
  }
}

export function track(container: HTMLElement) {
  const element = container.querySelector('[data-timeline-track]')
  if (!(element instanceof HTMLElement)) throw new Error('track not rendered')
  return element
}
