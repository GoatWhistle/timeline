import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { currentStage, EVENT, fixMoscowClock, goToStage, trigger } from './event-form.harness'

fixMoscowClock()

function submitButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-event-form] button[type="submit"]')
}

function footerButtons(): HTMLElement[] {
  const footer = document.querySelector<HTMLElement>('[data-stage-footer]')
  return Array.from(footer?.querySelectorAll<HTMLElement>('button') ?? [])
}

function backButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-stage-back]')
}

describe('creation belongs to the last stage alone', () => {
  it('offers no submit button on the first stage', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(currentStage()).toBe('kind')
    expect(submitButton()).toBeNull()
  })

  it('offers no submit button on any intermediate stage', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const stage of ['basics', 'period', 'place'] as const) {
      await goToStage(user, stage)
      expect(submitButton(), stage).toBeNull()
    }
  })

  it('offers the submit button on the last stage of a hackathon', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'prize')
    expect(submitButton()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('offers the submit button on the last stage of a meetup, which is the place', async () => {
    const { user } = renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'place')
    expect(submitButton()).not.toBeNull()
  })

  it('shows no back action on the first stage and one on every later stage', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(backButton()).toBeNull()
    for (const stage of ['basics', 'period', 'place', 'prize'] as const) {
      await goToStage(user, stage)
      expect(backButton(), stage).not.toBeNull()
    }
  })
})

describe('Enter in a field cannot create the event from an early stage', () => {
  it('never submits when Enter is pressed in the title of an early stage', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'Typed then Enter{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(currentStage()).toBe('basics')
  })

  it('keeps the guard even when every required value is already filled', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await goToStage(user, 'basics')
    await user.type(trigger('event-organizer'), 'Someone{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(currentStage()).toBe('basics')
  })

  it('refuses a submit raised on the form itself while an early stage is open', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={onSubmit} />,
    )
    await goToStage(user, 'basics')
    const form = document.querySelector<HTMLFormElement>('[data-event-form]')
    if (!form) throw new Error('no form')
    await act(async () => {
      form.requestSubmit()
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(currentStage()).toBe('period')
  })

  it('carries exactly one footer action on an early stage and two on a later one', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(footerButtons()).toHaveLength(1)
    await goToStage(user, 'basics')
    expect(footerButtons()).toHaveLength(2)
  })
})

describe('the kind choice shows a preview, the way the theme choice does', () => {
  it('draws a distinct preview inside each option card', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const kind of ['HACKATHON', 'MEETUP']) {
      const card = document.querySelector(`[data-kind-option="${kind}"]`)
      expect(card, kind).not.toBeNull()
      expect(card?.querySelector(`[data-kind-preview="${kind}"]`), kind).not.toBeNull()
    }
  })

  it('hides the preview from assistive technology and keeps the radio the control', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const preview of document.querySelectorAll('[data-kind-preview]')) {
      expect(preview).toHaveAttribute('aria-hidden', 'true')
    }
    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('grows the preview only behind motion-safe, never unconditionally', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const preview of document.querySelectorAll('[data-kind-preview]')) {
      const classes = preview.className
      expect(classes).toContain('motion-safe:group-hover:scale-[1.02]')
      expect(classes).not.toMatch(/(?<!motion-safe:)\bgroup-hover:scale-/)
    }
  })
})

describe('the stage area keeps a stable frame between stages', () => {
  it('holds every stage in one panel that reserves a minimum height', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    for (const stage of ['kind', 'basics', 'period', 'place', 'prize'] as const) {
      await goToStage(user, stage)
      const panel = document.querySelector(`[data-stage-panel="${stage}"]`)
      expect(panel, stage).not.toBeNull()
      const frame = panel?.parentElement
      expect(frame?.className, stage).toContain('min-h-stage')
      expect(frame?.className, stage).toContain('justify-start')
    }
  })

  it('animates the stage change only behind motion-safe', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    const panel = document.querySelector('[data-stage-panel="basics"]')
    expect(panel?.className).toContain('motion-safe:animate-stage-in')
    expect(panel?.className).not.toMatch(/(?<!motion-safe:)\banimate-stage-in\b/)
  })
})
