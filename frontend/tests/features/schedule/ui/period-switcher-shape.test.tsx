import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'

const STYLES = readFileSync(
  join(process.cwd(), 'src/features/schedule/ui/view-tabs/view-tabs.module.css'),
  'utf8',
)

const HEX = /#[0-9a-fA-F]{3,8}\b/

function block(name: string): string {
  const start = STYLES.indexOf(`.${name} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  return STYLES.slice(start, STYLES.indexOf('}', start))
}

function renderTabs(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ViewTabs
      value="month"
      onChange={vi.fn()}
      period="31 Aug — 6 Sep 2026"
      onStep={vi.fn()}
      {...props}
    />,
  )
}

describe('the period switcher is an arrow, a label, an arrow, and a home of its own', () => {
  it('draws exactly three controls beside the scales', () => {
    const { container } = renderTabs()
    const nav = container.querySelector('[data-schedule-period]')

    expect(nav?.querySelectorAll('button')).toHaveLength(3)
    for (const mark of ['previous', 'next', 'home']) {
      expect(nav?.querySelector(`[data-schedule-${mark}]`)).not.toBeNull()
    }
  })

  it('keeps the home button in the same place in both states, so nothing shifts', () => {
    const order = (atPresent: boolean) => {
      const { container, unmount } = renderTabs({ atPresent })
      const marks = [...(container.querySelectorAll('[data-schedule-period] > *') ?? [])].map(
        (node) =>
          node.getAttribute('data-schedule-previous') !== null
            ? 'previous'
            : node.getAttribute('data-schedule-next') !== null
              ? 'next'
              : node.getAttribute('data-schedule-home') !== null
                ? 'home'
                : 'label',
      )
      unmount()
      return marks
    }

    expect(order(true)).toEqual(['previous', 'label', 'next', 'home'])
    expect(order(false)).toEqual(order(true))
  })
})

describe('the label sizes itself to what it says', () => {
  it('fixes no width on the period label, whatever the scale spells', () => {
    const present = block('present')
    const text = block('periodText')

    for (const source of [present, text]) {
      expect(source).not.toMatch(/\bmin-width\b/)
      expect(source).not.toMatch(/^\s*width:/m)
    }
  })
})

describe('the arrows are glyphs in the accent, not boxes', () => {
  it('gives the step controls no border and no filled ground', () => {
    const step = block('step')

    expect(step).toMatch(/border:\s*0/)
    expect(step).toMatch(/background-color:\s*transparent/)
    expect(step).toMatch(/color:\s*var\(--accent\)/)
  })

  it('spells every colour with a token, never a raw hex', () => {
    expect(STYLES).not.toMatch(HEX)
  })

  it('never reaches for the outline button, whose whole point is the border', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/schedule/ui/view-tabs/view-tabs.tsx'),
      'utf8',
    )
    expect(source).not.toMatch(/variant="outline"/)
  })
})

describe('a thumb still reaches every control of the switcher', () => {
  it.each(['previous', 'next', 'home'])('keeps the coarse-pointer floor on %s', (mark) => {
    const { container } = renderTabs({ atPresent: false })
    const classes = container.querySelector(`[data-schedule-${mark}]`)?.className.split(/\s+/)

    for (const name of TOUCH_REACH.split(/\s+/)) expect(classes).toContain(name)
  })
})
