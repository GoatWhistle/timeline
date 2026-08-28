import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { URGENCY_ORDER } from '@/entities/deadline/urgency/urgency'
import { countdownLabel } from '@/entities/deadline/urgency/urgency-label'
import { UrgencyMark } from '@/entities/deadline/urgency/urgency-mark'
import { buildBurning, DEFAULT_FILTERS } from '@/features/burning/model/burning'
import { BurningRow } from '@/features/burning/ui/burning-row/burning-row'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { events, NOW } from './burning-fixtures'

function renderMarks() {
  const view = renderWithProviders(
    <div>
      {URGENCY_ORDER.map((urgency) => (
        <UrgencyMark key={urgency} urgency={urgency} label={urgency} />
      ))}
    </div>,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

function renderRows() {
  const items = buildBurning(events(), { ...DEFAULT_FILTERS, activeOnly: false }, NOW)
  const view = renderWithProviders(
    <TooltipProvider>
      {items.map((item) => (
        <BurningRow
          key={item.event.id}
          item={item}
          now={NOW}
          selected={false}
          onSelect={() => undefined}
        />
      ))}
    </TooltipProvider>,
  )
  view.container.style.filter = 'grayscale(1)'
  return { ...view, items }
}

describe('urgency under grayscale', () => {
  it('applies the grayscale filter the check uses', () => {
    expect(renderMarks().container.style.filter).toBe('grayscale(1)')
  })

  it('gives every level a distinct icon, so shape survives without colour', () => {
    const { container } = renderMarks()
    const icons = [...container.querySelectorAll('[data-urgency-icon]')].map(
      (node) => (node as HTMLElement).dataset.urgencyIcon,
    )
    expect(icons).toHaveLength(URGENCY_ORDER.length)
    expect(new Set(icons).size).toBe(URGENCY_ORDER.length)
  })

  it('gives every level a distinct border shape as a third channel', () => {
    const { container } = renderMarks()
    const shapes = [...container.querySelectorAll('[data-urgency]')].map(
      (node) => (node as HTMLElement).className,
    )
    expect(new Set(shapes).size).toBe(URGENCY_ORDER.length)
  })

  it('spells the level out in text on every mark', () => {
    const { container } = renderMarks()
    for (const mark of container.querySelectorAll('[data-urgency]')) {
      expect(mark.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('burning rows under grayscale', () => {
  it('carries a countdown in words on every pressing row', () => {
    const { container, items } = renderRows()
    for (const item of items) {
      const row = container.querySelector(`[data-burning-row="${item.event.id}"]`)
      expect(row).not.toBeNull()
      expect(row?.textContent).toContain(countdownLabel(item.urgency, item.deadlineAt, NOW))
    }
  })

  it('marks the level on the row itself, not only in its colour', () => {
    const { container, items } = renderRows()
    for (const item of items) {
      const row = container.querySelector<HTMLElement>(`[data-burning-row="${item.event.id}"]`)
      expect(row?.dataset.urgency).toBe(item.urgency)
    }
  })

  it('separates a waiver from a self reported mark in the row text', () => {
    const { container } = renderRows()
    const waived = container.querySelector('[data-burning-row="waived"]')
    const done = container.querySelector('[data-burning-row="done"]')
    expect(waived?.textContent).not.toEqual(done?.textContent)
  })

  it('offers the mark button only where an action is actually open', () => {
    const { container, items } = renderRows()
    for (const item of items) {
      const row = container.querySelector<HTMLElement>(`[data-burning-row="${item.event.id}"]`)
      expect(row?.dataset.actionable).toBe(String(item.actionable))
    }
  })
})

describe('honest wording', () => {
  it('never claims the system confirmed or verified a registration', () => {
    const { container } = renderRows()
    const text = (container.textContent ?? '').toLowerCase()
    for (const forbidden of ['confirmed', 'verified', 'checked by']) {
      expect(text).not.toContain(forbidden)
    }
  })
})
