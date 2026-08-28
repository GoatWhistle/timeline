import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import type {
  EventState,
  Place,
  ScheduleResponse,
  ScheduleRow,
  StageType,
} from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

export function stageTypeText(type: StageType): string {
  return i18n.t(STAGE_TYPE_KEY[type])
}

export function eventStateText(state: EventState): string {
  return i18n.t(EVENT_STATE_KEY[state])
}

const place: Place = { format: 'ONLINE', inherited: true }

export const deadlineName = new RegExp(
  i18n.t('schedule.registrationDeadlineAria', { date: '' }).trim().replace(/\s+/g, '\\s+'),
)

export const schedule: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    {
      event_id: 'e1',
      title: 'Winter Hackathon',
      state: 'ACTIVE',
      start_at: '2026-01-10T00:00:00Z',
      end_at: '2026-02-10T00:00:00Z',
      effective_format: 'ONLINE',
      registration_deadline: '2026-01-20T00:00:00Z',
      team_role: 'Captain',
      stages: [
        {
          id: 's1',
          name: 'Participant registration',
          type: 'REGISTRATION',
          start_at: '2026-01-10T00:00:00Z',
          end_at: '2026-01-20T00:00:00Z',
          place,
        },
        {
          id: 's2',
          name: 'Application Review',
          type: 'SELECTION',
          start_at: '2026-01-18T00:00:00Z',
          end_at: '2026-02-01T00:00:00Z',
          place,
        },
      ],
    },
    {
      event_id: 'e2',
      title: 'Spring Meetup',
      state: 'UPCOMING',
      start_at: '2026-03-01T00:00:00Z',
      end_at: '2026-03-02T00:00:00Z',
      effective_format: 'ONLINE',
      stages: [],
    },
  ],
}

export const overlappingStages: ScheduleRow['stages'] = [
  {
    id: 's1',
    name: 'First',
    type: 'REGISTRATION',
    start_at: '2026-01-10T00:00:00Z',
    end_at: '2026-02-20T00:00:00Z',
    place,
  },
  {
    id: 's2',
    name: 'Second',
    type: 'SELECTION',
    start_at: '2026-01-15T00:00:00Z',
    end_at: '2026-02-25T00:00:00Z',
    place,
  },
  {
    id: 's3',
    name: 'Third',
    type: 'DEMO',
    start_at: '2026-01-20T00:00:00Z',
    end_at: '2026-03-01T00:00:00Z',
    place,
  },
]

export function rowWith(stages: ScheduleRow['stages']): ScheduleResponse {
  return {
    range: schedule.range,
    rows: [
      {
        event_id: 'e1',
        title: 'Winter Hackathon',
        state: 'ACTIVE',
        start_at: '2026-01-10T00:00:00Z',
        end_at: '2026-03-10T00:00:00Z',
        effective_format: 'ONLINE',
        stages,
      },
    ],
  }
}

export function track(container: HTMLElement) {
  const element = container.querySelector('[data-schedule-track]')
  if (!(element instanceof HTMLElement)) throw new Error('track not rendered')
  return element
}
