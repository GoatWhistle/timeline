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

function shapeOf(node: Element): string {
  return (node.querySelector('[aria-hidden="true"]') as HTMLElement).className
}

describe('event state under grayscale', () => {
  it('applies the grayscale filter the check uses', () => {
    expect(renderMarks().container.style.filter).toBe('grayscale(1)')
  })

  it('renders one mark per state', () => {
    const { container } = renderMarks()
    expect(container.querySelectorAll('[data-event-state]')).toHaveLength(EVENT_STATES.length)
  })

  it('gives every state a shape no other state shares, so colour is never the only signal', () => {
    const { container } = renderMarks()
    const shapes = [...container.querySelectorAll('[data-event-state]')].map(shapeOf)
    expect(new Set(shapes).size).toBe(EVENT_STATES.length)
  })

  it('separates the states by form and fill, not by hue alone', () => {
    const { container } = renderMarks()
    const signatures = [...container.querySelectorAll('[data-event-state]')].map((node) => {
      const shape = shapeOf(node)
      return [
        shape.includes('rounded-full') ? 'round' : 'square',
        shape.includes('bg-current') ? 'filled' : 'hollow',
        shape.includes('border-dashed') ? 'dashed' : 'solid',
        shape.includes('size-2') ? 'large' : 'small',
      ].join('/')
    })
    expect(new Set(signatures).size).toBe(EVENT_STATES.length)
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
