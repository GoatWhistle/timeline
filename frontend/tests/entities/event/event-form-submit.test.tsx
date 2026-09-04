import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { ApiError } from '@/shared/api/errors'
import {
  calendarButton,
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
  await user.click(calendarButton('event-start'))
  await user.click(day('2026-05-01'))
  await user.click(calendarButton('event-end'))
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

  it('refuses to submit without a period and names both empty moments', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'National event')
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findAllByRole('alert')).toHaveLength(2)
    expect(document.getElementById('event-start-error')).not.toBeNull()
    expect(document.getElementById('event-end-error')).not.toBeNull()
  })

  it('blames the start alone when only the start is missing', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'National event')
    await goToStage(user, 'period')
    await user.clear(trigger('event-end'))
    await user.type(trigger('event-end'), '03.05.2026')
    await user.clear(timeField('event-end-time'))
    await user.type(timeField('event-end-time'), '1800')
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.getElementById('event-start-error')).not.toBeNull()
    expect(document.getElementById('event-end-error')).toBeNull()
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
        fields: [{ field: 'title', code: '', message: 'already taken' }],
      }),
    )
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await goToStage(user, 'basics')
    await submitForm(user)
    expect(await screen.findByText('already taken')).toBeInTheDocument()
  })

  it('shows a server complaint about the period next to the end field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: 'validation_failed',
        fields: [
          { field: 'end_at', code: 'end_before_start', message: 'must be later than start_at' },
        ],
      }),
    )
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await submitForm(user)
    await goToStage(user, 'period')
    const complaint = document.getElementById('event-end-error')
    expect(complaint).not.toBeNull()
    expect(document.getElementById('event-start-error')).toBeNull()
  })

  it('shows a server complaint about the start next to the start field, not the end', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: 'validation_failed',
        fields: [{ field: 'start_at', code: 'required', message: 'required field' }],
      }),
    )
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await submitForm(user)
    await goToStage(user, 'period')
    expect(document.getElementById('event-start-error')).not.toBeNull()
    expect(document.getElementById('event-end-error')).toBeNull()
  })
})
