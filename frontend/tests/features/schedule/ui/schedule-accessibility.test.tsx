import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import { NOW, range, rowWith, schedule } from './schedule-fixtures'

function renderGrid(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ScheduleGrid data={schedule} range={range} scale="month" now={NOW} {...props} />,
  )
}

describe('schedule accessibility', () => {
  it('exposes the scale as a table', () => {
    renderGrid()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBe(schedule.rows.length + 1)
  })

  it('reads a row as one coherent sentence, not eight cells', () => {
    renderGrid()
    const rows = screen.getAllByRole('row').slice(1)
    const sentence = rows[0]?.getAttribute('aria-label') ?? ''

    expect(sentence).toContain('Winter Hackathon')
    expect(sentence).toContain('Participant registration')
    expect(sentence).toContain('Application Review')
    expect(sentence.split('.').filter(Boolean).length).toBeGreaterThan(2)
  })

  it('gives each row exactly one tab stop', () => {
    const { container } = renderGrid()
    const tabbable = [...container.querySelectorAll('[tabindex="0"]')]
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]?.tagName).toBe('TR')
  })

  it('leaves every bar and moment out of the tab order', () => {
    const { container } = renderGrid()
    for (const item of container.querySelectorAll('[data-schedule-item]')) {
      expect(item).toHaveAttribute('tabindex', '-1')
    }
  })

  it('moves the cursor along the row with the arrow keys', async () => {
    const { container, user } = renderGrid()
    const row = container.querySelectorAll('[data-schedule-row]')[0] as HTMLElement
    row.focus()

    await user.keyboard('{ArrowRight}')
    const focused = container.querySelectorAll('[data-focused="true"]')
    expect(focused.length).toBe(1)
  })

  it('moves the tab stop between rows with the vertical arrows', async () => {
    const { container, user } = renderGrid()
    const rows = [...container.querySelectorAll('[data-schedule-row]')] as HTMLElement[]
    rows[0]?.focus()

    await user.keyboard('{ArrowDown}')
    expect(rows[1]).toHaveAttribute('tabindex', '0')
    expect(rows[0]).toHaveAttribute('tabindex', '-1')
  })

  it('jumps to today on t and zooms on plus and minus', async () => {
    const onToday = vi.fn()
    const onZoom = vi.fn()
    const { container, user } = renderGrid({ onToday, onZoom })
    const row = container.querySelectorAll('[data-schedule-row]')[0] as HTMLElement
    row.focus()

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
    const row = container.querySelectorAll('[data-schedule-row]')[0] as HTMLElement
    row.focus()

    await user.keyboard('{Enter}')
    expect(onNavigate).toHaveBeenCalledWith('/events/e1')
  })

  it('carries a polite live region for announcements', () => {
    const { container } = renderGrid()
    const live = container.parentElement?.querySelector('[aria-live="polite"]')
    expect(live).toBeInTheDocument()
    expect(live?.className).toContain('sr-only')
  })

  it('marks a stage without confirmed dates by outline, not by colour', () => {
    const data = rowWith([
      {
        id: 'guess',
        name: 'Unknown dates',
        type: 'PARTICIPATION',
        start_at: '2026-01-10T00:00:00Z',
        end_at: '2026-03-10T00:00:00Z',
        place: { format: 'ONLINE', inherited: true },
      },
    ])
    const { container } = renderWithProviders(
      <ScheduleGrid data={data} range={range} scale="month" now={NOW} />,
    )
    const bar = container.querySelector('[data-schedule-item="guess"]')
    expect(bar).toHaveAttribute('data-unconfirmed', 'true')
    expect(bar?.className).not.toContain('bg-stage-')
  })

  it('highlights exactly one nearest moment across the whole grid', () => {
    const { container } = renderGrid()
    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1)
  })
})
