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

describe('short place fields stand in pairs, not one to a line', () => {
  it('scope and format share one row instead of stacking', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('origin')).toBe(rowOf('event-format'))
  })

  it('that row is a two-column grid, the pairing the rest of the form already uses', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('event-format').className).toContain('sm:grid-cols-2')
  })

  it('start and end keep sharing their row, which is the pattern being followed', () => {
    renderWithProviders(
      <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
    )
    expect(rowOf('event-start')).toBe(rowOf('event-end'))
  })
})
