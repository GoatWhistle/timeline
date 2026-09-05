import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { i18n } from '@/shared/i18n/config'
import { EVENT, fixMoscowClock } from './event-form.harness'

fixMoscowClock()

const EVERY_FIELD = [
  'event-title',
  'event-organizer',
  'event-website',
  'event-description',
  'event-start',
  'event-end',
  'origin',
  'event-format',
  'event-prize-pool',
  'event-prize-currency',
  'event-team-size-min',
  'event-team-size-max',
]

function steps(): Element[] {
  return Array.from(document.querySelectorAll('[data-stage-step]'))
}

function submitButtons(): Element[] {
  return Array.from(document.querySelectorAll('[data-event-form] button[type="submit"]'))
}

describe('creating an event walks a pipeline', () => {
  it('renders the stepper with its rail of stages', () => {
    renderWithProviders(<EventForm submitLabel="Create" onSubmit={vi.fn()} />)
    expect(steps().length).toBeGreaterThan(0)
    expect(document.querySelector('[data-event-stage]')).not.toBeNull()
    expect(document.querySelector('[data-event-layout="flat"]')).toBeNull()
  })

  it('shows only the stage it is on, not every field at once', () => {
    renderWithProviders(<EventForm submitLabel="Create" onSubmit={vi.fn()} />)
    expect(document.getElementById('event-title')).toBeNull()
    expect(document.getElementById('event-prize-pool')).toBeNull()
    expect(screen.getByTestId('kind')).toBeInTheDocument()
  })
})

describe('editing an event on the admin card shows the fields directly', () => {
  it('renders no stepper at all', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(steps()).toHaveLength(0)
    expect(document.querySelector('[data-event-stage]')).toBeNull()
    expect(document.querySelector('[data-event-layout="flat"]')).not.toBeNull()
  })

  it('shows every field of the event at once, with no navigation needed', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'OFFLINE', country_code: 'RU', city: 'Moscow' }}
        mode="edit"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    for (const id of [...EVERY_FIELD, 'event-country', 'event-city']) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
  })

  it('shows the kind but offers nothing that could change it', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(document.querySelector('[data-kind-locked="HACKATHON"]')).not.toBeNull()
    expect(document.querySelectorAll('[data-kind-option]')).toHaveLength(0)
    expect(document.querySelectorAll('input[name="event-kind-choice"]')).toHaveLength(0)
  })

  it('never offers the other kind, so a hackathon cannot be turned into a meetup here', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(screen.queryByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeNull()
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.HACKATHON'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.kindFixed'))).toBeInTheDocument()
  })

  it('carries one save button and no forward or back action', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(submitButtons()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(document.querySelector('[data-stage-back]')).toBeNull()
    expect(document.querySelector('[data-stage-footer]')).toBeNull()
  })

  it('saves from anywhere on the card without walking a sequence first', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={onSubmit} />,
    )
    await user.clear(document.getElementById('event-title') as HTMLInputElement)
    await user.type(document.getElementById('event-title') as HTMLInputElement, 'Edited flat')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Edited flat', kind: 'HACKATHON' }),
    )
  })

  it('drops the prize section for a meetup here too, without forking the field list', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, kind: 'MEETUP' }}
        mode="edit"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-stage-section="prize"]')).toBeNull()
    for (const id of ['event-prize-pool', 'event-team-size-min']) {
      expect(document.getElementById(id), id).toBeNull()
    }
    expect(document.getElementById('event-title')).not.toBeNull()
  })
})

function accessibleName(node: Element): string {
  const by = node.getAttribute('aria-labelledby')
  if (by !== null) return document.getElementById(by)?.textContent?.trim() ?? ''
  return node.getAttribute('aria-label')?.trim() ?? ''
}

describe('both modes are built from one set of stage definitions', () => {
  it('names the same sections in the flat form as the pipeline names as stages', () => {
    const { unmount } = renderWithProviders(<EventForm submitLabel="Create" onSubmit={vi.fn()} />)
    const staged = steps().map((node) => (node as HTMLElement).dataset.stageStep)
    unmount()

    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    const flat = Array.from(document.querySelectorAll('[data-stage-section]')).map(
      (node) => (node as HTMLElement).dataset.stageSection,
    )
    expect(flat).toEqual(staged)
  })

  it('gives every flat section the same wording the stepper gives that stage', () => {
    const { unmount } = renderWithProviders(<EventForm submitLabel="Create" onSubmit={vi.fn()} />)
    const worded = new Map(
      steps().map((node) => [
        (node as HTMLElement).dataset.stageStep,
        Array.from(node.querySelectorAll('span'))
          .filter((span) => span.getAttribute('aria-hidden') === null)
          .map((span) => span.textContent?.trim() ?? '')
          .join(''),
      ]),
    )
    unmount()

    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    const sections = Array.from(document.querySelectorAll('[data-stage-section]'))
    expect(sections.length).toBe(worded.size)
    for (const section of sections) {
      const id = (section as HTMLElement).dataset.stageSection ?? ''
      const wanted = worded.get(id) ?? ''
      expect(wanted, id).not.toBe('')
      expect(accessibleName(section), id).toContain(wanted)
    }
  })
})
