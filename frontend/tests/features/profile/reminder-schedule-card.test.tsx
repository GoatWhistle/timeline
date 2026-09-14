import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import type {
  Channel,
  NotificationPreference,
  ReminderScheduleResponse,
  UpdateReminderScheduleRequest,
} from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

const DAY_CHOICES = [1, 2, 3, 7, 14]
const LIVE: Set<Channel> = new Set<Channel>(['TELEGRAM', 'EMAIL'])
const NO_PREFERENCES: NotificationPreference[] = []

let schedule: ReminderScheduleResponse
const sent: UpdateReminderScheduleRequest[] = []

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/shared/api/client', () => ({
  api: {
    GET: vi.fn(async () => ({ data: schedule })),
    PUT: vi.fn(async (_path: string, options: { body: UpdateReminderScheduleRequest }) => {
      sent.push(options.body)
      return { data: schedule }
    }),
  },
  unwrap: vi.fn(async (promise: Promise<{ data: unknown }>) => (await promise).data),
}))

function scheduleOf(
  occasions: { occasion: string; days_before: number[] }[],
  overdueEnabled = false,
): ReminderScheduleResponse {
  return {
    day_choices: DAY_CHOICES,
    overdue_enabled: overdueEnabled,
    version: 1,
    occasions: occasions as ReminderScheduleResponse['occasions'],
  }
}

const ALL_OCCASIONS = [
  'REMINDER_REGISTRATION_DEADLINE',
  'REMINDER_EVENT_START',
  'REMINDER_STAGE_START',
  'REMINDER_EVENT_END',
]

function fullSchedule(days: number[], overdueEnabled = false) {
  return scheduleOf(
    ALL_OCCASIONS.map((occasion) => ({ occasion, days_before: [...days] })),
    overdueEnabled,
  )
}

function sentFor(occasion: string) {
  const last = sent.at(-1)
  return last?.occasions?.find((entry) => entry.occasion === occasion)
}

function renderCard() {
  return renderWithProviders(
    <NotificationExplainerCard preferences={NO_PREFERENCES} liveChannels={LIVE} />,
  )
}

function dayChip(occasion: string, count: number) {
  return screen.findByRole('button', {
    name: i18n.t('notification:reminder.dayLabel', {
      occasion: i18n.t(`notification:explainer.type.${occasion}.name`),
      count,
    }),
  })
}

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('ru')
})

afterEach(() => {
  sent.length = 0
})

describe('the reminder schedule is the reader own setting', () => {
  it('clearing the last day of an occasion sends that occasion with an empty day list', async () => {
    schedule = fullSchedule([3])
    const { user } = renderCard()

    await user.click(await dayChip('REMINDER_EVENT_START', 3))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sentFor('REMINDER_EVENT_START')).toBeDefined()
    expect(sentFor('REMINDER_EVENT_START')?.days_before).toEqual([])
  })

  it('keeps an occasion that already had no day, so a replacing write cannot revive it', async () => {
    schedule = scheduleOf(
      ALL_OCCASIONS.map((occasion) => ({
        occasion,
        days_before: occasion === 'REMINDER_EVENT_END' ? [] : [3],
      })),
    )
    const { user } = renderCard()

    await user.click(await dayChip('REMINDER_EVENT_START', 3))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sentFor('REMINDER_EVENT_END')).toBeDefined()
    expect(sentFor('REMINDER_EVENT_END')?.days_before).toEqual([])
  })

  it('carries every occasion in the replacing body, not only the one just touched', async () => {
    schedule = fullSchedule([1])
    const { user } = renderCard()

    await user.click(await dayChip('REMINDER_STAGE_START', 7))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.occasions?.map((entry) => entry.occasion).sort()).toEqual(
      [...ALL_OCCASIONS].sort(),
    )
    expect(sentFor('REMINDER_STAGE_START')?.days_before).toEqual([1, 7])
    expect(sentFor('REMINDER_EVENT_END')?.days_before).toEqual([1])
  })

  it('sends the overdue switch, and keeps the chosen days alongside it', async () => {
    schedule = fullSchedule([2], false)
    const { user } = renderCard()

    const overdue = await screen.findByRole('button', {
      name: i18n.t('notification:reminder.overdueTitle'),
    })
    await user.click(overdue)

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.overdue_enabled).toBe(true)
    expect(sentFor('REMINDER_REGISTRATION_DEADLINE')?.days_before).toEqual([2])
  })

  it('turning the overdue switch off sends false rather than dropping the field', async () => {
    schedule = fullSchedule([], true)
    const { user } = renderCard()

    const overdue = await screen.findByRole('button', {
      name: i18n.t('notification:reminder.overdueTitle'),
    })
    await user.click(overdue)

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.overdue_enabled).toBe(false)
  })

  it('offers a day picker on exactly the four occasions the schedule governs', async () => {
    schedule = fullSchedule([])
    renderCard()

    await waitFor(() =>
      expect(document.querySelectorAll('[data-reminder-occasion]')).toHaveLength(
        ALL_OCCASIONS.length,
      ),
    )
    const rendered = [...document.querySelectorAll('[data-reminder-occasion]')].map((node) =>
      node.getAttribute('data-reminder-occasion'),
    )
    expect(rendered).toEqual(ALL_OCCASIONS)
  })

  it('offers exactly the days the server allows, not a hardcoded set', async () => {
    schedule = scheduleOf(
      ALL_OCCASIONS.map((occasion) => ({ occasion, days_before: [] })),
      false,
    )
    schedule.day_choices = [1, 5]
    renderCard()

    expect(await dayChip('REMINDER_EVENT_START', 5)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: i18n.t('notification:reminder.dayLabel', {
          occasion: i18n.t('notification:explainer.type.REMINDER_EVENT_START.name'),
          count: 14,
        }),
      }),
    ).not.toBeInTheDocument()
  })
})
