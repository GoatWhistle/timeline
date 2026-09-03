import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { ApiError } from '@/shared/api/errors'
import {
  day,
  EVENT,
  fixMoscowClock,
  goToStage,
  submitForm,
  timeField,
  trigger,
} from './event-form.harness'

fixMoscowClock()

async function fillPeriod(user: { click: (element: Element) => Promise<void> }) {
  await user.click(trigger('event-start'))
  await user.click(day('2026-05-01'))
  await user.click(trigger('event-end'))
  await user.click(day('2026-05-03'))
}

describe('creating an event', () => {
  it('sends what was typed, with the times converted to UTC', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)

    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'National event')
    await goToStage(user, 'period')
    await fillPeriod(user)
    await user.clear(timeField('event-start-time'))
    await user.type(timeField('event-start-time'), '1000')
    await user.clear(timeField('event-end-time'))
    await user.type(timeField('event-end-time'), '1800')
    await submitForm(user)

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'National event',
        start_at: '2026-05-01T07:00:00.000Z',
        end_at: '2026-05-03T15:00:00.000Z',
        kind: 'HACKATHON',
        format: 'ONLINE',
        origin: 'RU',
      }),
    )
  })

  it('refuses to submit without a title', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses to submit without a period', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'National event')
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('editing an existing event', () => {
  it('opens on the stored values shown in the profile zone', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'basics')
    expect(trigger('event-title')).toHaveValue('Existing')
    await goToStage(user, 'period')
    expect(trigger('event-start')).toHaveAttribute('data-value', '2026-05-01')
    expect(timeField('event-start-time')).toHaveValue('10:00')
    expect(timeField('event-end-time')).toHaveValue('18:00')
  })

  it('saves back the same instants when only the title changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await goToStage(user, 'basics')
    await user.clear(trigger('event-title'))
    await user.type(trigger('event-title'), 'Renamed')
    await submitForm(user)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renamed',
        start_at: '2026-05-01T07:00:00.000Z',
        end_at: '2026-05-03T15:00:00.000Z',
      }),
    )
  })

  it('shows a field complaint the server made', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: 'validation_failed',
        fields: [{ field: 'title', message: 'already taken' }],
      }),
    )
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await goToStage(user, 'basics')
    await submitForm(user)
    expect(await screen.findByText('already taken')).toBeInTheDocument()
  })

  it('shows a server complaint about the period next to the period', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: 'validation_failed',
        fields: [{ field: 'end_at', message: 'must be later than start_at' }],
      }),
    )
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await submitForm(user)
    await goToStage(user, 'period')
    expect(await screen.findByText('must be later than start_at')).toBeInTheDocument()
  })
})
