import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import { bars, gridProps, NOW, rowWith, schedule } from './schedule-fixtures'

function renderGrid(props: Record<string, unknown> = {}) {
  return renderWithProviders(<ScheduleGrid data={schedule} {...gridProps} now={NOW} {...props} />)
}

function viewports(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll('[data-schedule-viewport]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

function focusViewport(container: HTMLElement) {
  viewports(container)
    .find((element) => element.tabIndex === 0)
    ?.focus()
}

describe('schedule accessibility', () => {
  it('names the calendar as a whole', () => {
    const { container } = renderGrid()
    const canvas = container.querySelector('[aria-label]')
    expect(canvas).toBeInTheDocument()
  })

  it('reads an event as one coherent sentence, not a pile of labels', () => {
    const { container } = renderGrid()
    const sentence =
      bars(container)
        .find((bar) => bar.textContent?.includes('Winter Hackathon'))
        ?.getAttribute('aria-label') ?? ''

    expect(sentence).toContain('Winter Hackathon')
    expect(sentence).toContain('Participant registration')
    expect(sentence).toContain('Application Review')
    expect(sentence.split('.').filter((part) => part.trim()).length).toBeGreaterThan(2)
  })

  it('gives the calendar exactly one tab stop', () => {
    const { container } = renderGrid()
    const tabbable = [...container.querySelectorAll('[tabindex="0"]')]
    expect(tabbable).toHaveLength(1)
    expect((tabbable[0] as HTMLElement).dataset.scheduleViewport).toBeDefined()
  })

  it('keeps a tab stop when the schedule holds no events at all', () => {
    const { container } = renderGrid({ data: { range: schedule.range, rows: [] } })

    expect(container.querySelectorAll('[data-schedule-viewport]').length).toBeGreaterThan(0)

    const tabbable = viewports(container).filter((element) => element.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('keeps a tab stop when every event falls after the viewed range', () => {
    const { container } = renderGrid({
      from: new Date('2025-01-01T00:00:00Z'),
      to: new Date('2025-02-01T00:00:00Z'),
    })

    const tabbable = viewports(container).filter((element) => element.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('keeps a tab stop when every event falls before the viewed range', () => {
    const { container } = renderGrid({
      from: new Date('2027-01-01T00:00:00Z'),
      to: new Date('2027-02-01T00:00:00Z'),
    })

    const tabbable = viewports(container).filter((element) => element.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('leaves every bar and overflow control out of the tab order', () => {
    const { container } = renderGrid()
    for (const item of container.querySelectorAll('[data-schedule-item]')) {
      expect(item).toHaveAttribute('tabindex', '-1')
    }
  })

  it('moves the cursor between events with the horizontal arrows', async () => {
    const { container, user } = renderGrid()
    focusViewport(container)

    await user.keyboard('{ArrowRight}')
    expect(container.querySelectorAll('[data-focused="true"]').length).toBeGreaterThan(0)
  })

  it('moves the cursor to another lane with the vertical arrows', async () => {
    const { container, user } = renderGrid()
    focusViewport(container)

    await user.keyboard('{ArrowRight}')
    const before = container
      .querySelector('[data-focused="true"]')
      ?.getAttribute('data-schedule-item')

    await user.keyboard('{ArrowDown}')
    const after = container
      .querySelector('[data-focused="true"]')
      ?.getAttribute('data-schedule-item')

    expect(before).toBeDefined()
    expect(after).toBeDefined()
  })

  it('jumps to today on t and zooms on plus and minus', async () => {
    const onToday = vi.fn()
    const onZoom = vi.fn()
    const { container, user } = renderGrid({ onToday, onZoom })
    focusViewport(container)

    await user.keyboard('t')
    expect(onToday).toHaveBeenCalled()

    await user.keyboard('+')
    expect(onZoom).toHaveBeenCalledWith(1)

    await user.keyboard('-')
    expect(onZoom).toHaveBeenCalledWith(-1)
  })

  it('opens the event on Enter', async () => {
    const onNavigate = vi.fn()
    const { container, user } = renderGrid({ onNavigate })
    focusViewport(container)

    await user.keyboard('{Enter}')
    expect(onNavigate).toHaveBeenCalledWith('/events/e1')
  })

  it('respects the supplied href builder when opening', async () => {
    const onNavigate = vi.fn()
    const { container, user } = renderGrid({
      onNavigate,
      hrefBuilder: (row: { event_id: string }) => `/admin/events/${row.event_id}`,
    })
    focusViewport(container)

    await user.keyboard('{Enter}')
    expect(onNavigate).toHaveBeenCalledWith('/admin/events/e1')
  })

  it('carries a polite live region for announcements', () => {
    const { container } = renderGrid()
    const live = container.parentElement?.querySelector('[aria-live="polite"]')
    expect(live).toBeInTheDocument()
    expect(live?.className).toContain('sr-only')
  })

  it('marks an event with no stage information by outline, not by colour', () => {
    const data = rowWith([])
    const { container } = renderWithProviders(<ScheduleGrid data={data} {...gridProps} now={NOW} />)
    const bar = bars(container)[0]
    expect(bar).toHaveAttribute('data-unconfirmed', 'true')
    expect(bar?.className).not.toContain('bg-stage-')
  })

  it('highlights exactly one nearest moment across the whole calendar', () => {
    const { container } = renderGrid()
    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1)
  })
})
