import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WEEK_AXIS_WIDTH } from '@/features/schedule/ui/week-grid/week-layout'
import type { ScheduleResponse } from '@/shared/api/types.gen'

const WEEK_FROM = new Date('2026-01-05T00:00:00')
const WEEK_TO = new Date('2026-01-11T23:59:59')
const NOW = new Date('2026-01-07T12:00:00')

const empty: ScheduleResponse = {
  range: { from: WEEK_FROM.toISOString(), to: WEEK_TO.toISOString() },
  rows: [],
}

function renderWeek() {
  return renderWithProviders(
    <WeekGrid data={empty} from={WEEK_FROM} to={WEEK_TO} locale={enUS} now={NOW} />,
  )
}

function label(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-schedule-band] > :first-child')
}

describe('the all-day band names itself inside a gutter it actually fits', () => {
  it('prints a gutter-sized label, the long sentence having spilled across the day columns', () => {
    const { container } = renderWeek()
    const shown = label(container)?.querySelector('[aria-hidden="true"]')

    expect(shown?.textContent).toBe('All day')
    expect(shown?.textContent).not.toContain('multi-day')
  })

  it('still reads the whole sentence to a screen reader, the short label being for the eye', () => {
    const { container } = renderWeek()
    const spoken = label(container)?.querySelector('.sr-only')

    expect(spoken?.textContent).toBe('All day and multi-day')
  })

  it('hides the short label from the reader, so the band is not announced twice', () => {
    const { container } = renderWeek()

    expect(label(container)?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(label(container)?.textContent).toBe('All dayAll day and multi-day')
  })

  it('keeps the visible label shorter than the sentence it stands for', () => {
    const { container } = renderWeek()
    const shown = label(container)?.querySelector('[aria-hidden="true"]')?.textContent ?? ''
    const spoken = label(container)?.querySelector('.sr-only')?.textContent ?? ''

    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(spoken.length)
  })

  it('leaves the gutter narrow enough that a long label would have had to wrap', () => {
    expect(WEEK_AXIS_WIDTH).toBeLessThan(80)
  })
})
