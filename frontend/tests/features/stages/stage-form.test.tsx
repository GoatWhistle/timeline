import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { StageForm } from '@/features/stages/stage-form'
import type { StageResponse } from '@/shared/api/types.gen'
import {
  calendarButton,
  day,
  fixMoscowClock,
  timeField,
  trigger,
} from '../../entities/event/event-form.harness'

fixMoscowClock()

const STAGE = {
  id: 'st_1',
  event_id: 'ev_1',
  name: 'Existing stage',
  type: 'PARTICIPATION',
  start_at: '2026-05-01T07:00:00Z',
  end_at: '2026-05-01T09:00:00Z',
  sort_order: 0,
  format: 'ONLINE',
  place: { format: 'ONLINE', inherited: false },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as StageResponse

type User = {
  type: (element: Element, text: string) => Promise<void>
  click: (element: Element) => Promise<void>
  clear: (element: Element) => Promise<void>
}

function submitButton(): HTMLElement {
  const button = document.querySelector<HTMLElement>('form button[type="submit"]')
  if (!button) throw new Error('no submit button')
  return button
}

function firstOption(): HTMLElement {
  const option = document.querySelector<HTMLElement>('[role="option"]')
  if (!option) throw new Error('no select option')
  return option
}

async function fillRequiredFields(user: User, name: string) {
  await user.type(trigger('stage-name'), name)
  await user.click(calendarButton('stage-start'))
  await user.click(day('2026-05-01'))
  await user.clear(timeField('stage-start-time'))
  await user.type(timeField('stage-start-time'), '1000')
  await user.click(calendarButton('stage-end'))
  await user.click(day('2026-05-01'))
  await user.clear(timeField('stage-end-time'))
  await user.type(timeField('stage-end-time'), '1200')
}

describe('creating a stage never sends a field the create endpoint rejects', () => {
  it('omits clear_format when the format is left as inherit on a new stage', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<StageForm submitLabel="Create" onSubmit={onSubmit} />)

    await fillRequiredFields(user, 'Opening')
    await user.click(submitButton())

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).not.toHaveProperty('clear_format')
    expect(payload).not.toHaveProperty('format')
  })

  it('still sends clear_format when editing an existing stage back to inherit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <StageForm stage={STAGE} submitLabel="Save" onSubmit={onSubmit} />,
    )

    await user.click(trigger('stage-format'))
    await user.click(firstOption())
    await user.click(submitButton())

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload.clear_format).toBe(true)
  })
})
