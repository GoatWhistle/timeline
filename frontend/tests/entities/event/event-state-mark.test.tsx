import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EVENT_STATES } from '@/entities/event/event.labels'
import { EventStateMark } from '@/entities/event/event-state-mark/event-state-mark'

function renderMarks() {
  const view = renderWithProviders(
    <div>
      {EVENT_STATES.map((state) => (
        <EventStateMark key={state} state={state} />
      ))}
    </div>,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

function glyphOf(node: Element): string {
  return node.querySelector('svg')?.innerHTML ?? ''
}

describe('event state under grayscale', () => {
  it('applies the grayscale filter the check uses', () => {
    expect(renderMarks().container.style.filter).toBe('grayscale(1)')
  })

  it('renders one mark per state', () => {
    const { container } = renderMarks()
    expect(container.querySelectorAll('[data-event-state]')).toHaveLength(EVENT_STATES.length)
  })

  it('gives every state a glyph no other state shares, so colour is never the only signal', () => {
    const { container } = renderMarks()
    const glyphs = [...container.querySelectorAll('[data-event-state]')].map(glyphOf)

    expect(glyphs.every((glyph) => glyph.length > 0)).toBe(true)
    expect(new Set(glyphs).size).toBe(EVENT_STATES.length)
  })

  it('marks the one live state apart, and marks only that one', () => {
    const { container } = renderMarks()
    const haloed = [...container.querySelectorAll('[data-event-state]')].filter(
      (node) => node.querySelector('[data-event-state-sign] > span[aria-hidden="true"]') !== null,
    )

    expect(haloed).toHaveLength(1)
    expect(haloed[0]?.getAttribute('data-event-state')).toBe('ACTIVE')
  })

  it('spells the state out for a screen reader on every mark', () => {
    const { container } = renderMarks()
    for (const node of container.querySelectorAll('[data-event-state]')) {
      expect(node.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('drops the spoken label when the row supplies its own', () => {
    const view = renderWithProviders(<EventStateMark state="ACTIVE" labelled={false} />)
    expect(view.container.textContent?.trim()).toBe('')
  })
})
