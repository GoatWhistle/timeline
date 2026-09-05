import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  PHONE_CELL_MAX,
  PHONE_CELL_MIN,
  phoneCellFromHeight,
  phoneCellFromWidth,
  phoneDayCell,
} from '@/features/schedule/model/phone-scale'
import { PhoneSchedule } from '@/features/schedule/ui/phone-agenda/phone-schedule'
import { WEEK_BAND_BAR } from '@/features/schedule/ui/week-grid/week-layout'
import {
  PHONE_LANDSCAPE_QUERY,
  PHONE_PORTRAIT_QUERY,
  PHONE_QUERY,
} from '@/shared/ui/layout/mobile/mobile-state'
import { NOW, schedule } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')
const TAP_TARGET = 44
const PHONE_WIDTHS = [360, 390]

function sheet(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

type Screen = { width: number; height: number; coarse: boolean }

function feature(clause: string, screen: Screen): boolean {
  const width = clause.match(/^\(max-width:\s*(\d+)px\)$/)
  if (width) return screen.width <= Number(width[1])
  const height = clause.match(/^\(max-height:\s*(\d+)px\)$/)
  if (height) return screen.height <= Number(height[1])
  if (clause === '(pointer: coarse)') return screen.coarse
  throw new Error(`unknown media feature ${clause}`)
}

function matchMediaFor(screen: Screen): (query: string) => boolean {
  return (query) =>
    query
      .split(', ')
      .some((branch) => branch.split(' and ').every((clause) => feature(clause, screen)))
}

function renderPhone(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <PhoneSchedule data={schedule} from={MONTH_FROM} months={1} now={NOW} {...props} />,
  )
}

describe('a day of the phone month is a target a thumb can hit', () => {
  it.each(PHONE_WIDTHS)('never falls under the touch target at %ipx', (width) => {
    expect(phoneDayCell(width, 800, 6)).toBeGreaterThanOrEqual(TAP_TARGET)
  })

  it('keeps its own floor above the bare touch target, not level with it', () => {
    expect(PHONE_CELL_MIN).toBeGreaterThan(TAP_TARGET)
  })

  it.each(PHONE_WIDTHS)('holds the floor at %ipx even when no room is known yet', (width) => {
    expect(phoneDayCell(width)).toBeGreaterThanOrEqual(PHONE_CELL_MIN)
  })

  it('asks the sheet for the touch target as the cell width floor', () => {
    const css = sheet('src/features/schedule/ui/phone-month/phone-month.module.css')
    const cell = css.slice(css.indexOf('.cell {'), css.indexOf('.cell[data-weekend'))

    expect(cell).toContain('min-width: var(--tap-target)')
    expect(cell).toContain('min-height: var(--phone-day-cell)')
  })
})

describe('the phone month spends the room it is given instead of leaving it empty', () => {
  it.each(PHONE_WIDTHS)('grows well past the touch target at %ipx of a tall phone', (width) => {
    expect(phoneDayCell(width, 620, 5)).toBeGreaterThan(TAP_TARGET * 1.5)
  })

  it('gives a taller phone a taller cell than a shorter one of the same width', () => {
    expect(phoneDayCell(390, 620, 5)).toBeGreaterThan(phoneDayCell(390, 380, 5))
  })

  it('spends the whole room across the rows the month really has', () => {
    const rows = 5
    const room = 560
    const cell = phoneCellFromHeight(room, rows)

    expect(cell * rows).toBeLessThanOrEqual(room)
    expect((cell + 1) * rows).toBeGreaterThan(room - 100)
  })

  it('stops growing at a ceiling, so one month never becomes a scroll of its own', () => {
    const wide = 2000
    expect(phoneCellFromWidth(wide)).toBeGreaterThan(PHONE_CELL_MAX)
    expect(phoneCellFromHeight(4000, 5)).toBeGreaterThan(PHONE_CELL_MAX)
    expect(phoneDayCell(wide, 4000, 5)).toBe(PHONE_CELL_MAX)
  })

  it('lets the height bound the cell when a wide screen is short', () => {
    expect(phoneDayCell(844, 300, 5)).toBeLessThan(phoneCellFromWidth(844))
  })

  it('publishes the cell it chose on the month, so the screen can be measured', () => {
    const { container } = renderPhone()
    const month = container.querySelector('[data-schedule-month]')

    expect(month?.getAttribute('data-schedule-phone-cell')).not.toBeNull()
    expect(Number(month?.getAttribute('data-schedule-phone-cell'))).toBeGreaterThanOrEqual(
      PHONE_CELL_MIN,
    )
  })
})

describe('a phone laid on its side is still a phone', () => {
  it('counts a short coarse viewport as a phone, not only a narrow one', () => {
    expect(PHONE_QUERY).toContain(PHONE_LANDSCAPE_QUERY)
  })

  it('asks for a coarse pointer before calling a short window a phone', () => {
    expect(PHONE_LANDSCAPE_QUERY).toContain('pointer: coarse')
    expect(PHONE_LANDSCAPE_QUERY).toContain('max-height')
  })

  it('keeps the narrow rule as an alternative, so neither branch swallows the other', () => {
    expect(PHONE_QUERY.split(', ')).toEqual([PHONE_PORTRAIT_QUERY, PHONE_LANDSCAPE_QUERY])
  })

  it('turns a phone on its side into the phone month, not the desktop grid', () => {
    const landscape = matchMediaFor({ width: 844, height: 390, coarse: true })
    expect(landscape(PHONE_QUERY)).toBe(true)
  })

  it('leaves a short desktop window on the desktop grid, its pointer being fine', () => {
    const desktop = matchMediaFor({ width: 1440, height: 400, coarse: false })
    expect(desktop(PHONE_QUERY)).toBe(false)
  })

  it('still calls a narrow tall screen a phone, the older rule surviving', () => {
    const portrait = matchMediaFor({ width: 390, height: 844, coarse: true })
    expect(portrait(PHONE_QUERY)).toBe(true)
  })
})

describe('a row of the phone agenda is a target a thumb can hit', () => {
  it('reaches past the touch target under a coarse pointer', () => {
    const css = sheet('src/features/schedule/ui/phone-agenda/agenda-row.module.css')
    const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))

    expect(coarse).toContain('min-height: calc(var(--tap-target) + 8px)')
  })

  it('keeps the plain touch target as its floor for every other pointer', () => {
    const css = sheet('src/features/schedule/ui/phone-agenda/agenda-row.module.css')
    const row = css.slice(css.indexOf('.row {'), css.indexOf('@media'))

    expect(row).toContain('min-height: var(--tap-target)')
  })
})

describe('the all-day bar of the week is reachable by thumb without growing on screen', () => {
  it('lends the bar a coarse-pointer reach that meets the touch target', () => {
    const css = sheet('src/features/schedule/ui/week-grid/week-grid.module.css')
    const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))
    const reach = coarse.slice(0, coarse.indexOf('}\n}') + 3)

    expect(reach).toContain('[data-schedule-item]::after')
    expect(reach).toContain('min-width: var(--tap-target)')
    expect(reach).toContain('min-height: var(--tap-target)')
  })

  it('reaches out from the centre, so the bar keeps the place it is drawn in', () => {
    const css = sheet('src/features/schedule/ui/week-grid/week-grid.module.css')
    const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))

    expect(coarse).toContain('transform: translate(-50%, -50%)')
  })

  it('needs that reach because the drawn bar is shorter than a thumb, and stays so', () => {
    expect(WEEK_BAND_BAR).toBeLessThan(TAP_TARGET)
  })
})

describe('the agenda of a chosen day is brought into view, not left below the fold', () => {
  function days(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll('[data-schedule-day]')].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    )
  }

  function dayNamed(container: HTMLElement, key: string): HTMLElement {
    const found = days(container).find((day) => day.dataset.scheduleDay === key)
    if (!found) throw new Error(`no day cell for ${key}`)
    return found
  }

  it('scrolls the panel into view the moment a day is chosen', () => {
    const seen: unknown[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function record(options?: unknown) {
      if (this instanceof HTMLElement && this.hasAttribute('data-schedule-day-agenda')) {
        seen.push(options)
      }
    }

    try {
      const { container } = renderPhone()
      fireEvent.click(dayNamed(container, '2026-0-15'))

      expect(seen).toHaveLength(1)
      expect(seen[0]).toEqual({ block: 'nearest' })
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('scrolls again when a different day is chosen, not only on the first pick', () => {
    const seen: unknown[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function record() {
      if (this instanceof HTMLElement && this.hasAttribute('data-schedule-day-agenda')) {
        seen.push(this.getAttribute('data-schedule-day-agenda'))
      }
    }

    try {
      const { container } = renderPhone()
      fireEvent.click(dayNamed(container, '2026-0-15'))
      fireEvent.click(dayNamed(container, '2026-0-16'))

      expect(seen).toEqual(['2026-0-15', '2026-0-16'])
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})
