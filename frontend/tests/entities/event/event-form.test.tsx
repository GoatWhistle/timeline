import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import {
  calendarButton,
  day,
  EVENT,
  fixMoscowClock,
  goToStage,
  type StageName,
  submitForm,
  timeField,
  trigger,
} from './event-form.harness'

fixMoscowClock()

const HACKATHON_ONLY: [StageName, string][] = [
  ['prize', 'event-prize-pool'],
  ['prize', 'event-prize-currency'],
  ['prize', 'event-team-size-min'],
  ['prize', 'event-team-size-max'],
]

const SHARED: [StageName, string][] = [
  ['basics', 'event-title'],
  ['basics', 'event-organizer'],
  ['basics', 'origin'],
  ['basics', 'event-website'],
  ['basics', 'event-description'],
  ['period', 'event-start'],
  ['period', 'event-end'],
  ['place', 'event-format'],
]

describe('the hackathon form offers every field of the specification', () => {
  it('reaches the shared fields and the hackathon ones through the pipeline', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(document.querySelector('[data-event-form="HACKATHON"]')).not.toBeNull()
    for (const [stage, id] of [...SHARED, ...HACKATHON_ONLY]) {
      await goToStage(user, stage)
      expect(document.getElementById(id), id).not.toBeNull()
    }
  })
})

describe('the meetup form offers no hackathon field', () => {
  it('reaches every shared field and offers no prize stage at all', async () => {
    const { user } = renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(document.querySelector('[data-event-form="MEETUP"]')).not.toBeNull()
    expect(document.querySelector('[data-stage-step="prize"]')).toBeNull()
    for (const [stage, id] of SHARED) {
      await goToStage(user, stage)
      expect(document.getElementById(id), id).not.toBeNull()
    }
    for (const [, id] of HACKATHON_ONLY) {
      expect(document.getElementById(id), id).toBeNull()
    }
  })

  it('sends a meetup payload without a prize pool or a team bound', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await submitForm(user)
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload.kind).toBe('MEETUP')
    for (const key of ['prize_pool', 'prize_currency', 'team_size_min', 'team_size_max']) {
      expect(payload, key).not.toHaveProperty(key)
    }
  })
})

describe('the kind is the first stage and switching keeps what was typed', () => {
  it('opens a new event on the kind stage with nothing else on it', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(document.querySelector('[data-event-stage]')).toHaveAttribute('data-event-stage', 'kind')
    expect(screen.getByTestId('kind')).toBeInTheDocument()
    for (const id of ['event-title', 'event-prize-pool', 'event-start']) {
      expect(document.getElementById(id), id).toBeNull()
    }
  })

  it('keeps the title, the organizer and the dates across a switch of kind', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)

    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'Shared title')
    await user.type(trigger('event-organizer'), 'Some club')
    await goToStage(user, 'period')
    await user.click(calendarButton('event-start'))
    await user.click(day('2026-05-01'))
    await user.clear(timeField('event-start-time'))
    await user.type(timeField('event-start-time'), '1000')
    await user.click(calendarButton('event-end'))
    await user.click(day('2026-05-03'))
    await user.clear(timeField('event-end-time'))
    await user.type(timeField('event-end-time'), '1800')

    await goToStage(user, 'kind')
    await user.click(screen.getByText(/meetup/i))

    expect(document.querySelector('[data-event-form="MEETUP"]')).not.toBeNull()
    await goToStage(user, 'basics')
    expect(trigger('event-title')).toHaveValue('Shared title')
    expect(trigger('event-organizer')).toHaveValue('Some club')
    await goToStage(user, 'period')
    expect(trigger('event-start')).toHaveAttribute('data-value', '2026-05-01')
    expect(timeField('event-end-time')).toHaveValue('18:00')
  })

  it('brings the shared fields back when the kind is switched again', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'Round trip')
    await goToStage(user, 'kind')
    await user.click(screen.getByText(/meetup/i))
    await user.click(screen.getByText(/hackathon/i))
    expect(document.querySelector('[data-event-form="HACKATHON"]')).not.toBeNull()
    await goToStage(user, 'basics')
    expect(trigger('event-title')).toHaveValue('Round trip')
  })
})

describe('the place fields follow the format on both forms', () => {
  it('hides the country and the city for an online event', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'place')
    expect(document.getElementById('event-country')).toBeNull()
    expect(document.getElementById('event-city')).toBeNull()
  })

  it('shows the country and the city for an on-site hackathon', async () => {
    const { user } = renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'OFFLINE', country_code: 'RU', city: 'Moscow' }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    await goToStage(user, 'place')
    expect(trigger('event-country')).toHaveValue('RU')
    expect(trigger('event-city')).toHaveValue('Moscow')
  })

  it('shows the country for an on-site meetup as well', async () => {
    const { user } = renderWithProviders(
      <EventForm
        event={{ ...EVENT, kind: 'MEETUP', format: 'HYBRID', country_code: 'DE' }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    await goToStage(user, 'place')
    expect(trigger('event-country')).toHaveValue('DE')
  })

  it('leaves a clean seam for a cover control', async () => {
    const { user } = renderWithProviders(
      <EventForm submitLabel="Save" cover={<p>cover slot</p>} onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'basics')
    expect(screen.getByText('cover slot')).toBeInTheDocument()
  })
})
