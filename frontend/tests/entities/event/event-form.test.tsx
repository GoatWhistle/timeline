import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { ApiError } from '@/shared/api/errors'
import { day, EVENT, fixMoscowClock, timeField, trigger } from './event-form.harness'

fixMoscowClock()

const HACKATHON_ONLY = [
  'event-track',
  'event-prize-pool',
  'event-prize-currency',
  'event-team-size-min',
  'event-team-size-max',
]

const SHARED = [
  'event-title',
  'origin',
  'event-format',
  'event-organizer',
  'event-website',
  'event-description',
  'event-notes',
  'event-start',
  'event-end',
]

describe('the hackathon form offers every field of the specification', () => {
  it('shows the shared fields and the hackathon ones', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const id of [...SHARED, ...HACKATHON_ONLY]) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
    expect(document.querySelector('[data-event-form="HACKATHON"]')).not.toBeNull()
  })
})

describe('the meetup form offers no hackathon field', () => {
  it('shows the shared fields and none of the hackathon ones', () => {
    renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    for (const id of SHARED) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
    for (const id of HACKATHON_ONLY) {
      expect(document.getElementById(id), id).toBeNull()
    }
    expect(document.querySelector('[data-event-form="MEETUP"]')).not.toBeNull()
  })

  it('sends a meetup payload without a prize pool or a team bound', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload.kind).toBe('MEETUP')
    for (const key of ['prize_pool', 'prize_currency', 'track', 'team_size_min', 'team_size_max']) {
      expect(payload, key).not.toHaveProperty(key)
    }
  })
})

describe('the kind is chosen before the form and switching keeps what was typed', () => {
  it('keeps the title, the organizer and the dates across a switch of kind', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)

    await user.type(trigger('event-title'), 'Shared title')
    await user.type(trigger('event-organizer'), 'Some club')
    await user.click(trigger('event-start'))
    await user.click(day('2026-05-01'))
    await user.clear(timeField('event-start-time'))
    await user.type(timeField('event-start-time'), '1000')
    await user.click(trigger('event-end'))
    await user.click(day('2026-05-03'))
    await user.clear(timeField('event-end-time'))
    await user.type(timeField('event-end-time'), '1800')

    await user.click(screen.getByText(/meetup/i))

    expect(document.querySelector('[data-event-form="MEETUP"]')).not.toBeNull()
    expect(trigger('event-title')).toHaveValue('Shared title')
    expect(trigger('event-organizer')).toHaveValue('Some club')
    expect(trigger('event-start')).toHaveAttribute('data-value', '2026-05-01')
    expect(timeField('event-end-time')).toHaveValue('18:00')
  })

  it('brings the shared fields back when the kind is switched again', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await user.type(trigger('event-title'), 'Round trip')
    await user.click(screen.getByText(/meetup/i))
    await user.click(screen.getByText(/hackathon/i))
    expect(document.querySelector('[data-event-form="HACKATHON"]')).not.toBeNull()
    expect(trigger('event-title')).toHaveValue('Round trip')
  })
})

describe('the place fields follow the format on both forms', () => {
  it('hides the country and the city for an online event', () => {
    renderWithProviders(<EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />)
    expect(document.getElementById('event-country')).toBeNull()
    expect(document.getElementById('event-city')).toBeNull()
  })

  it('shows the country and the city for an on-site hackathon', () => {
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

  it('shows the country for an on-site meetup as well', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, kind: 'MEETUP', format: 'HYBRID', country_code: 'DE' }}
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
