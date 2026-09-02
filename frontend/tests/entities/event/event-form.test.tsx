import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { ApiError } from '@/shared/api/errors'
import { day, EVENT, fixMoscowClock, timeField, trigger } from './event-form.harness'

fixMoscowClock()

describe('every field of the specification is on the form', () => {
  it('offers the taxonomy, the place, the prize and the team bounds', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const id of [
      'event-title',
      'kind',
      'origin',
      'event-format',
      'event-track',
      'event-prize-pool',
      'event-prize-currency',
      'event-team-min',
      'event-team-max',
      'event-organizer',
      'event-website',
      'event-description',
      'event-notes',
      'event-start',
      'event-end',
    ]) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
  })

  it('hides the country and the city for an online event', () => {
    renderWithProviders(<EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />)
    expect(document.getElementById('event-country')).toBeNull()
    expect(document.getElementById('event-city')).toBeNull()
  })

  it('shows the country and the city for an on-site event', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'OFFLINE', country_code: 'RU', city: 'Moscow' }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    expect(trigger('event-country')).toHaveValue('RU')
    expect(trigger('event-city')).toHaveValue('Moscow')
  })

  it('shows the country and the city for a hybrid event', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'HYBRID', country_code: 'DE' }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    expect(trigger('event-country')).toHaveValue('DE')
  })

  it('leaves a clean seam for a cover control', () => {
    renderWithProviders(
      <EventForm submitLabel="Save" cover={<p>cover slot</p>} onSubmit={vi.fn()} />,
    )
    expect(screen.getByText('cover slot')).toBeInTheDocument()
  })
})

describe('creating an event', () => {
  it('sends what was typed, with the times converted to UTC', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)

    await user.type(trigger('event-title'), 'National event')
    await user.click(trigger('event-start'))
    await user.click(day('2026-05-01'))
    await user.clear(timeField('event-start-time'))
    await user.type(timeField('event-start-time'), '1000')
    await user.click(trigger('event-end'))
    await user.click(day('2026-05-03'))
    await user.clear(timeField('event-end-time'))
    await user.type(timeField('event-end-time'), '1800')
    await user.click(screen.getByRole('button', { name: 'Save' }))

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
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses to submit without a period', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await user.type(trigger('event-title'), 'National event')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('refuses a smallest team larger than the largest before reaching the server', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await user.clear(trigger('event-team-min'))
    await user.type(trigger('event-team-min'), '9')
    await user.clear(trigger('event-team-max'))
    await user.type(trigger('event-team-max'), '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('editing an existing event', () => {
  it('opens on the stored values shown in the profile zone', () => {
    renderWithProviders(<EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />)
    expect(trigger('event-title')).toHaveValue('Existing')
    expect(trigger('event-start')).toHaveAttribute('data-value', '2026-05-01')
    expect(timeField('event-start-time')).toHaveValue('10:00')
    expect(timeField('event-end-time')).toHaveValue('18:00')
  })

  it('saves back the same instants when only the title changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await user.clear(trigger('event-title'))
    await user.type(trigger('event-title'), 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))
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
    await user.click(screen.getByRole('button', { name: 'Save' }))
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
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('must be later than start_at')).toBeInTheDocument()
  })
})
