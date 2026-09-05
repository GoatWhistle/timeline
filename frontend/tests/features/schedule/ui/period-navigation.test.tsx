import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { differenceInCalendarDays } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { describe, expect, it, vi } from 'vitest'
import { SCHEDULE_SCALES } from '@/features/schedule/model/schedule-scale'
import {
  parseOffset,
  periodLabel,
  periodStart,
  scaleRange,
} from '@/features/schedule/model/use-schedule-view'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { i18n } from '@/shared/i18n/config'

const NOW = new Date('2026-05-14T12:00:00')

function renderTabs(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ViewTabs value="month" onChange={vi.fn()} period="May 2026" onStep={vi.fn()} {...props} />,
  )
}

describe('the scale list no longer carries an ALL tab', () => {
  it('offers exactly the four calendar scales', () => {
    expect(SCHEDULE_SCALES).toEqual(['week', 'month', 'quarter', 'year'])
  })

  it('names no tab All', () => {
    renderTabs()
    const names = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim().toLowerCase())
    expect(names).not.toContain('all')
    expect(names).toHaveLength(4)
  })
})

describe('every scale can be stepped backwards and forwards', () => {
  it.each(SCHEDULE_SCALES)(
    'names the previous and next control for %s, not a bare arrow',
    (scale) => {
      renderWithProviders(<ViewTabs value={scale} onChange={vi.fn()} period="x" onStep={vi.fn()} />)

      const previous = i18n.t(`schedule.previous${scale[0]?.toUpperCase()}${scale.slice(1)}`)
      const next = i18n.t(`schedule.next${scale[0]?.toUpperCase()}${scale.slice(1)}`)

      expect(screen.getByRole('button', { name: previous })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: next })).toBeInTheDocument()
      expect(previous).not.toMatch(/^[<>←→]/)
    },
  )

  it('reports a step backwards and a step forwards', async () => {
    const onStep = vi.fn()
    const { user } = renderTabs({ onStep })

    await user.click(screen.getByRole('button', { name: i18n.t('schedule.previousMonth') }))
    expect(onStep).toHaveBeenCalledWith(-1)

    await user.click(screen.getByRole('button', { name: i18n.t('schedule.nextMonth') }))
    expect(onStep).toHaveBeenCalledWith(1)
  })

  it('shifts the shown range by one whole period of the active scale', () => {
    expect(periodStart('month', NOW, 1).getMonth()).toBe(5)
    expect(periodStart('month', NOW, -1).getMonth()).toBe(3)
    expect(periodStart('year', NOW, 1).getFullYear()).toBe(2027)
    expect(periodStart('quarter', NOW, 1).getMonth()).toBe(6)
    expect(periodStart('week', NOW, 1).getDate()).toBe(18)
  })

  it('keeps a week exactly seven days long however far it is stepped', () => {
    const { from, to } = scaleRange('week', NOW, 9)
    expect(differenceInCalendarDays(to, from) + 1).toBe(7)
  })

  it('treats a damaged offset in the address as the present', () => {
    expect(parseOffset('nonsense')).toBe(0)
    expect(parseOffset(undefined)).toBe(0)
  })
})

describe('the period label is the only anchor left, so it must say where we are', () => {
  it('names the month and year on the month scale', () => {
    expect(periodLabel('month', new Date('2026-05-01'), new Date('2026-05-31'), enUS)).toContain(
      '2026',
    )
  })

  it('names the year alone on the year scale', () => {
    expect(periodLabel('year', new Date('2026-01-01'), new Date('2026-12-31'), enUS)).toBe('2026')
  })

  it('spans both months when a week straddles them', () => {
    const label = periodLabel('week', new Date('2026-04-27'), new Date('2026-05-03'), enUS)
    expect(label).toMatch(/Apr/)
    expect(label).toMatch(/May/)
  })

  it('shows the label on screen beside the arrows', () => {
    const { container } = renderTabs({ period: 'May 2026' })
    expect(container.querySelector('[data-schedule-period-label]')?.textContent).toBe('May 2026')
  })
})

describe('returning to the present is its own button, not the label wearing a second hat', () => {
  it('offers no separate today tab', () => {
    const { container } = renderTabs()
    expect(container.querySelector('[data-schedule-today]')).toBeNull()
  })

  it('keeps the home button on screen whether or not the view has drifted', () => {
    for (const atPresent of [true, false]) {
      const { container, unmount } = renderTabs({ atPresent })
      expect(container.querySelector('[data-schedule-home]')).not.toBeNull()
      unmount()
    }
  })

  it('never turns the period label into a control', () => {
    const { container } = renderTabs({ atPresent: false })
    const label = container.querySelector('[data-schedule-present]')

    expect(label?.tagName).not.toBe('BUTTON')
    expect(label?.querySelector('button')).toBeNull()
    expect(label?.querySelector('svg')).toBeNull()
  })

  it('goes back to the present when the home button is pressed', async () => {
    const onPresent = vi.fn()
    const { container, user } = renderTabs({ atPresent: false, onPresent })

    const home = container.querySelector<HTMLElement>('[data-schedule-home]')
    expect(home).not.toBeNull()
    if (home) await user.click(home)

    expect(onPresent).toHaveBeenCalled()
  })

  it('disables the home button while the view already shows the present', async () => {
    const onPresent = vi.fn()
    const { container, user } = renderTabs({ atPresent: true, onPresent })

    const home = container.querySelector<HTMLButtonElement>('[data-schedule-home]')
    expect(home?.disabled).toBe(true)
    if (home) await user.click(home)

    expect(onPresent).not.toHaveBeenCalled()
  })

  it('names the home button for a screen reader even though it shows only a glyph', () => {
    renderTabs({ atPresent: false })
    expect(
      screen.getByRole('button', { name: i18n.t('schedule.backToPresent') }),
    ).toBeInTheDocument()
  })
})
