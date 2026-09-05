import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { WRAPPED_SHAPE } from '@/features/schedule/model/schedule-scale'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { i18n } from '@/shared/i18n/config'
import {
  bars,
  eventStateText,
  NOW,
  rowWith,
  schedule,
  WEEK_FROM,
  WEEK_TO,
  weekLocale,
} from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')

function renderMonth(props: Record<string, unknown> = {}) {
  const shape = WRAPPED_SHAPE.month
  return renderWithProviders(
    <WrappedGrid
      data={schedule}
      from={MONTH_FROM}
      months={shape.months}
      columns={shape.columns}
      minCell={shape.minCell}
      barHeight={shape.barHeight}
      maxBar={shape.maxBar}
      now={NOW}
      {...props}
    />,
  )
}

function renderWeek(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <WeekGrid
      data={schedule}
      from={WEEK_FROM}
      to={WEEK_TO}
      locale={weekLocale}
      now={NOW}
      {...props}
    />,
  )
}

function days(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll('[data-schedule-day]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

describe('schedule accessibility', () => {
  it('names the calendar as a whole', () => {
    const { container } = renderMonth()
    expect(container.querySelector('[data-schedule-wrapped]')).toHaveAttribute('aria-label')
  })

  it('reads an event as one coherent sentence, not a pile of labels', () => {
    const { container } = renderMonth()
    const sentence =
      bars(container)
        .find((bar) => bar.getAttribute('aria-label')?.includes('Winter Hackathon'))
        ?.getAttribute('aria-label') ?? ''

    expect(sentence).toContain('Winter Hackathon')
    expect(sentence).toContain('Participant registration')
    expect(sentence).toContain('Application Review')
    expect(sentence.split('.').filter((part) => part.trim()).length).toBeGreaterThan(2)
  })

  it('keeps state, deadline and the key hint spoken, the hover card having dropped them', () => {
    const { container } = renderMonth()
    const sentence =
      bars(container)
        .find((bar) => bar.getAttribute('aria-label')?.includes('Winter Hackathon'))
        ?.getAttribute('aria-label') ?? ''

    expect(sentence).toContain(eventStateText('ACTIVE'))
    expect(sentence).toContain(i18n.t('schedule.selectHint'))
    expect(sentence).toMatch(/2026/)
  })

  it('gives the wrapped calendar exactly one tab stop', () => {
    const { container } = renderMonth()
    const tabbable = [...container.querySelectorAll('[tabindex="0"]')]

    expect(tabbable).toHaveLength(1)
    expect((tabbable[0] as HTMLElement).dataset.scheduleDay).toBeDefined()
  })

  it('keeps a tab stop when the schedule holds no events at all', () => {
    const { container } = renderMonth({ data: { range: schedule.range, rows: [] } })

    expect(days(container).length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('keeps a tab stop when every event falls outside the viewed range', () => {
    const { container } = renderMonth({ from: new Date('2027-01-01T00:00:00') })
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('leaves every bar out of the tab order so the day cells carry the roving focus', () => {
    const { container } = renderMonth()
    for (const item of container.querySelectorAll('[data-schedule-item]')) {
      expect(item).toHaveAttribute('tabindex', '-1')
    }
  })

  it('moves the day cursor with the horizontal arrows', async () => {
    const { container, user } = renderMonth()
    const first = days(container).find((day) => day.tabIndex === 0)
    first?.focus()

    await user.keyboard('{ArrowRight}')
    const focused = document.activeElement as HTMLElement

    expect(focused.dataset.scheduleDay).toBeDefined()
    expect(focused.dataset.scheduleDay).not.toBe(first?.dataset.scheduleDay)
  })

  it('moves the day cursor a whole week with the vertical arrows', async () => {
    const { container, user } = renderMonth()
    days(container)
      .find((day) => day.tabIndex === 0)
      ?.focus()
    const before = (document.activeElement as HTMLElement).dataset.scheduleDay

    await user.keyboard('{ArrowDown}')
    const after = (document.activeElement as HTMLElement).dataset.scheduleDay

    expect(before).toBeDefined()
    expect(after).toBeDefined()
    expect(after).not.toBe(before)
  })

  it('jumps to today on t', async () => {
    const { container, user } = renderMonth()
    days(container)
      .find((day) => day.tabIndex === 0)
      ?.focus()

    await user.keyboard('t')
    expect(document.activeElement).toHaveAttribute('data-today', 'true')
  })

  it('carries a polite live region for announcements', () => {
    const { container } = renderMonth()
    const live = container.parentElement?.querySelector('[aria-live="polite"]')

    expect(live).toBeInTheDocument()
    expect(live?.className).toContain('sr-only')
  })

  it('marks an event with no stage information by outline, not by colour', () => {
    const { container } = renderWeek({ data: rowWith([]) })
    const bar = bars(container)[0]

    expect(bar).toHaveAttribute('data-kind', 'HACKATHON')
    expect(bar?.className).not.toContain('bg-stage-')
  })

  it('gives every bar a button role and an accessible name, not a bare div', () => {
    const { container } = renderMonth()
    const found = bars(container)

    expect(found.length).toBeGreaterThan(0)
    for (const bar of found) {
      expect(bar.tagName).toBe('BUTTON')
      expect(bar.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('links a bar to its event through a button rather than an anchor', () => {
    const { container } = renderMonth()
    const bar = bars(container)[0]

    expect(bar?.tagName).toBe('BUTTON')
    expect(bar?.closest('a')).toBeNull()
  })

  it('describes an event with a Radix tooltip, not the title attribute', () => {
    const { container } = renderMonth()
    expect(container.querySelector('[title]')).toBeNull()
    expect(bars(container)[0]).toHaveAttribute('data-state', 'closed')
  })
})

describe('the week view carries the keyboard on its bars, having no day cells to rove', () => {
  it('renders no day cell at all, which is why it owns no roving tab stop', () => {
    const { container } = renderWeek()

    expect(days(container)).toHaveLength(0)
    expect(container.querySelectorAll('[data-schedule-day-head]').length).toBeGreaterThan(0)
  })

  it('leaves every bar in the tab order, since nothing else can carry the keyboard', () => {
    const { container } = renderWeek()
    const found = bars(container)

    expect(found.length).toBeGreaterThan(0)
    for (const bar of found) expect(bar).not.toHaveAttribute('tabindex', '-1')
  })

  it('strands no bar of either zone outside the tab order', () => {
    const { container } = renderWeek()
    const found = bars(container)
    const band = found.filter((bar) => bar.closest('[data-schedule-band]'))
    const hours = found.filter((bar) => bar.closest('[data-schedule-column]'))

    expect(band.length + hours.length).toBe(found.length)
    for (const bar of found) {
      expect(bar.tagName).toBe('BUTTON')
      expect(bar).not.toHaveAttribute('disabled')
    }
  })

  it('keeps the day heading out of the tab order, being a label and not a cell', () => {
    const { container } = renderWeek()
    for (const head of container.querySelectorAll('[data-schedule-day-head]')) {
      expect(head).not.toHaveAttribute('tabindex')
      expect(head.tagName).not.toBe('BUTTON')
    }
  })
})
