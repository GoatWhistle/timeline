import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  EVENT_COLOR_FAMILIES,
  EVENT_COLOR_SLOTS,
  EventColorMark,
  eventColorAttrs,
  validEventColor,
} from '@/entities/event/event-color'
import type { EventColor } from '@/shared/api/types.gen'

const EVERY_COLOR: EventColor[] = EVENT_COLOR_FAMILIES.flatMap((family) =>
  Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) => ({ family, slot })),
)

function renderAll() {
  const view = renderWithProviders(
    <div>
      {EVERY_COLOR.map((color) => (
        <EventColorMark key={`${color.family}-${color.slot}`} color={color} />
      ))}
    </div>,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

describe('the colour of an event reaches the DOM as one addressable pair', () => {
  it('marks every slot with its family and index', () => {
    const { container } = renderAll()
    const marks = [...container.querySelectorAll('[data-event-color]')]
    expect(marks).toHaveLength(EVENT_COLOR_SLOTS * EVENT_COLOR_FAMILIES.length)
    const pairs = marks.map(
      (node) => `${node.getAttribute('data-event-family')}:${node.getAttribute('data-event-slot')}`,
    )
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('never spells a colour into the component, only the slot that names it', () => {
    const { container } = renderAll()
    for (const node of container.querySelectorAll('[data-event-color]')) {
      expect((node as HTMLElement).style.cssText).toBe('')
    }
  })

  it('falls back to a declared family when the server sends no colour', () => {
    expect(eventColorAttrs(null)['data-event-family']).toBe('NONE')
    expect(eventColorAttrs(undefined)['data-event-slot']).toBe('')
  })

  it('refuses a slot outside the palette instead of pointing at a missing token', () => {
    expect(validEventColor({ family: 'RU', slot: EVENT_COLOR_SLOTS })).toBe(false)
    expect(validEventColor({ family: 'RU', slot: -1 })).toBe(false)
    expect(validEventColor({ family: 'MARS' as 'RU', slot: 0 })).toBe(false)
    expect(eventColorAttrs({ family: 'RU', slot: 99 })['data-event-family']).toBe('NONE')
  })
})

describe('colour is never the only signal that tells the families apart', () => {
  it('gives each family its own shape under grayscale', () => {
    const { container } = renderAll()
    const shapes = new Map<string, Set<string>>()
    for (const node of container.querySelectorAll('[data-event-color]')) {
      const family = node.getAttribute('data-event-family') as string
      const glyph = (node.querySelector('[aria-hidden="true"]') as HTMLElement).className
      const shape = glyph.includes('rounded-full') ? 'round' : 'square'
      shapes.set(family, (shapes.get(family) ?? new Set()).add(shape))
    }
    const perFamily = [...shapes.values()].map((set) => [...set].join(','))
    expect(new Set(perFamily).size).toBe(EVENT_COLOR_FAMILIES.length)
  })

  it('names the family for a screen reader on every mark', () => {
    const { container } = renderAll()
    for (const node of container.querySelectorAll('[data-event-color]')) {
      expect(node.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('speaks a translated name, never the raw key it was looked up by', () => {
    const { container } = renderAll()
    for (const node of container.querySelectorAll('[data-event-color]')) {
      const spoken = node.textContent?.trim() ?? ''
      expect(spoken).not.toMatch(/^[a-z-]+[:.][a-zA-Z.]+$/)
      expect(spoken).not.toContain('originValue')
    }
  })

  it('speaks up when no colour was assigned rather than showing a silent grey dot', () => {
    const view = renderWithProviders(<EventColorMark color={null} />)
    expect(view.container.textContent?.trim().length ?? 0).toBeGreaterThan(0)
  })

  it('drops the spoken label when the row already names the event', () => {
    const view = renderWithProviders(
      <EventColorMark color={{ family: 'RU', slot: 0 }} labelled={false} />,
    )
    expect(view.container.textContent?.trim()).toBe('')
  })
})
