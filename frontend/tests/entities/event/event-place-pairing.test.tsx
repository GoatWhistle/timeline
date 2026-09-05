import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { EVENT, fixMoscowClock } from './event-form.harness'

fixMoscowClock()

function field(id: string): HTMLElement {
  const node = document.getElementById(id)
  if (!node) throw new Error(`no ${id}`)
  return node
}

function rowOf(id: string): HTMLElement {
  const node = field(id).closest<HTMLElement>('.grid')
  if (!node) throw new Error(`no grid row around ${id}`)
  return node
}

function sectionOf(id: string): string {
  return field(id).closest<HTMLElement>('[data-stage-section]')?.dataset.stageSection ?? ''
}

describe('short fields stand in pairs, not one to a line', () => {
  it('scope and organizer share one row instead of stacking', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('origin')).toBe(rowOf('event-organizer'))
  })

  it('that row is a two-column grid, the pairing the rest of the form already uses', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('origin').className).toContain('sm:grid-cols-2')
  })

  it('country and city keep sharing their row inside place', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'OFFLINE', country_code: 'RU', city: 'Moscow' }}
        mode="edit"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    expect(rowOf('event-country')).toBe(rowOf('event-city'))
  })

  it('start and end keep sharing their row, which is the pattern being followed', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('event-start')).toBe(rowOf('event-end'))
  })
})

describe('scope is a catalogue fact, so it does not sit under the geography heading', () => {
  it('keeps scope out of place and in with the rest of what describes the event', () => {
    renderWithProviders(
      <EventForm
        event={{ ...EVENT, format: 'OFFLINE', country_code: 'RU', city: 'Moscow' }}
        mode="edit"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    )
    expect(sectionOf('origin')).toBe('basics')
    expect(sectionOf('event-format')).toBe('place')
    expect(sectionOf('event-country')).toBe('place')
  })
})
