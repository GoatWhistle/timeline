import { screen } from '@testing-library/react'
import { branch, text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { stagesOf } from '@/entities/event/event-form.stages'
import {
  currentStage,
  EVENT,
  fixMoscowClock,
  goToStage,
  submitForm,
  trigger,
} from './event-form.harness'

fixMoscowClock()

function steps(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-stage-step]')).map(
    (node) => node.dataset.stageStep ?? '',
  )
}

function stepButton(stage: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`[data-stage-step="${stage}"] button`)
  if (!node) throw new Error(`no step ${stage}`)
  return node
}

function doneFlags(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const node of document.querySelectorAll<HTMLElement>('[data-stage-step]')) {
    out[node.dataset.stageStep ?? ''] = node.dataset.stageDone ?? ''
  }
  return out
}

describe('the stages are a pipeline, not one sheet', () => {
  it('lists the hackathon stages in order, kind first and prizes last', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(steps()).toEqual(['kind', 'basics', 'period', 'place', 'prize'])
  })

  it('drops the prize stage for a meetup and keeps the rest in the same order', () => {
    renderWithProviders(
      <EventForm event={{ ...EVENT, kind: 'MEETUP' }} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(steps()).toEqual(['kind', 'basics', 'period', 'place'])
  })

  it('shows one stage at a time, never two', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    expect(currentStage()).toBe('basics')
    expect(document.getElementById('event-title')).not.toBeNull()
    expect(document.getElementById('event-start')).toBeNull()
    expect(document.getElementById('event-prize-pool')).toBeNull()
    expect(screen.queryByTestId('kind')).toBeNull()
  })

  it('marks the current stage for a screen reader as the current step', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(stepButton('kind')).toHaveAttribute('aria-current', 'step')
    await goToStage(user, 'basics')
    expect(stepButton('basics')).toHaveAttribute('aria-current', 'step')
    expect(stepButton('kind')).not.toHaveAttribute('aria-current')
  })

  it('lets the user go back to an earlier stage and find what was typed', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'Went forward')
    await goToStage(user, 'place')
    expect(currentStage()).toBe('place')
    await goToStage(user, 'basics')
    expect(currentStage()).toBe('basics')
    expect(trigger('event-title')).toHaveValue('Went forward')
  })

  it('reaches every stage from the keyboard alone', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await user.tab()
    expect(stepButton('kind')).toHaveFocus()
    await user.tab()
    expect(stepButton('basics')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(currentStage()).toBe('basics')
  })
})

describe('a stage that is filled reads as completed', () => {
  it('marks no stage done before anything is filled', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    expect(doneFlags()).toEqual({
      kind: 'false',
      basics: 'false',
      period: 'false',
      place: 'false',
      prize: 'false',
    })
  })

  it('marks a stage done once it is left through the forward action', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: text('en', 'event', 'stage.next') }))
    expect(currentStage()).toBe('basics')
    expect(doneFlags().kind).toBe('true')
    expect(doneFlags().basics).toBe('false')
  })

  it('refuses to advance while the stage still holds an invalid value', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-website'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: text('en', 'event', 'stage.next') }))
    expect(currentStage()).toBe('basics')
    expect(doneFlags().basics).toBe('false')
  })

  it('advances once the stage validates', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'Fine')
    await user.click(screen.getByRole('button', { name: text('en', 'event', 'stage.next') }))
    expect(currentStage()).toBe('period')
    expect(doneFlags().basics).toBe('true')
  })
})

describe('a rejected save lands on the stage that holds the problem', () => {
  it('opens the basics stage when the title is missing', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'place')
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(currentStage()).toBe('basics')
  })

  it('opens the period stage when the dates are missing', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={onSubmit} />)
    await goToStage(user, 'basics')
    await user.type(trigger('event-title'), 'National event')
    await submitForm(user)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(currentStage()).toBe('period')
  })
})

describe('the stage model is the single source of the split', () => {
  it('puts every hackathon-only field on the prize stage and none of them on an earlier one', () => {
    const stages = stagesOf('HACKATHON')
    const prize = stages.find((stage) => stage.id === 'prize')
    expect(prize?.fields).toEqual([
      'prize_pool',
      'prize_currency',
      'team_size_min',
      'team_size_max',
    ])
    for (const stage of stages.filter((candidate) => candidate.id !== 'prize')) {
      for (const field of prize?.fields ?? []) {
        expect(stage.fields, stage.id).not.toContain(field)
      }
    }
  })

  it('opens the basics stage on title, organizer, link and description, in that order', () => {
    const basics = stagesOf('MEETUP').find((stage) => stage.id === 'basics')
    expect(basics?.fields).toEqual(['title', 'organizer', 'website_url', 'description'])
  })

  it('names every stage in both dictionaries', () => {
    for (const locale of ['ru', 'en'] as const) {
      const named = branch(locale, 'event', 'stage')
      for (const stage of stagesOf('HACKATHON')) {
        const key = stage.labelKey.replace('stage.', '')
        expect(named[key], `${locale} ${key}`).toBeTypeOf('string')
      }
    }
  })
})
