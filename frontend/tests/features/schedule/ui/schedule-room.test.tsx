import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dictionaries } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import {
  WRAPPED_SHAPE,
  wrappedBarHeight,
  wrappedRowHeight,
} from '@/features/schedule/model/schedule-scale'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { LOCALES } from '@/shared/i18n/locale'
import { NOW, schedule, WEEK_FROM, WEEK_TO, weekLocale } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')
const SCALES = ['year', 'quarter', 'month'] as const

function sheet(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
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

function renderWrapped(scale: (typeof SCALES)[number], props: Record<string, unknown> = {}) {
  const shape = WRAPPED_SHAPE[scale]
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

describe('the empty all-day band says nothing, being visibly empty already', () => {
  it('prints no sentence in the band when the week holds no all-day event', () => {
    const { container } = renderWeek({ data: { range: schedule.range, rows: [] } })
    const band = container.querySelector('[data-schedule-band]')

    expect(band).not.toBeNull()
    expect(band?.textContent).toBe('All dayAll day and multi-day')
  })

  it.each(LOCALES)('leaves no orphaned allDayEmpty key in the %s dictionary', (locale) => {
    const bundle = dictionaries[locale].common as Record<string, Record<string, string>>
    expect(bundle.schedule).toBeDefined()
    expect(bundle.schedule?.allDayEmpty).toBeUndefined()
  })

  it('leaves no orphaned rule for the label it no longer prints', () => {
    expect(sheet('src/features/schedule/ui/week-grid/week-grid.module.css')).not.toContain(
      'bandEmpty',
    )
  })
})

describe('the all-day band sits flush against the hours below it', () => {
  it('opens the hour body with no padding pushing it off the band', () => {
    const css = sheet('src/features/schedule/ui/week-grid/week-grid.module.css')
    const body = css.slice(css.indexOf('.body {'), css.indexOf('.axis {'))

    expect(body).not.toContain('padding-block-start')
    expect(body).not.toContain('padding-block:')
    expect(body).not.toContain('margin-block-start')
  })

  it('leaves the band without a scroller of its own, so no bar can appear beside it', () => {
    const css = sheet('src/features/schedule/ui/week-grid/week-grid.module.css')
    const band = css.slice(css.indexOf('.bandScroll {'), css.indexOf('.bandLanes {'))

    expect(band).not.toContain('overflow-y: auto')
    expect(band).not.toContain('overflow: auto')
  })
})

describe('the wrapped views let the selection be taken off with Escape', () => {
  it.each(SCALES)('clears the selection on Escape inside the %s frame', async (scale) => {
    const onSelect = vi.fn()
    const { container, user } = renderWrapped(scale, { selectedId: 'e1', onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e1"]')
    expect(bar).not.toBeNull()
    bar?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('leaves Escape alone when nothing is selected, so it can reach an overlay above', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderWrapped('month', { onSelect })

    container.querySelector<HTMLElement>('[data-schedule-item="e1"]')?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).not.toHaveBeenCalledWith(undefined)
  })

  it('clears the selection from a day cell too, not only from a bar', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderWrapped('month', { selectedId: 'e1', onSelect })

    container.querySelector<HTMLElement>('[data-schedule-day]')?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })
})

describe('a bar is a readable rectangle at every scale, never a thread', () => {
  it.each(SCALES)('gives the %s scale a bar tall enough to carry a glyph', (scale) => {
    expect(WRAPPED_SHAPE[scale].barHeight).toBeGreaterThanOrEqual(16)
  })

  it.each(SCALES)('gives the %s scale a cell tall enough to stack two bars', (scale) => {
    const shape = WRAPPED_SHAPE[scale]
    const bar = wrappedBarHeight(shape.minCell, shape.barHeight, 2, shape.maxBar)

    expect(bar).toBeGreaterThanOrEqual(shape.barHeight)
  })

  it('never lets a coarser scale outgrow a finer one, the year staying the tightest', () => {
    expect(WRAPPED_SHAPE.year.barHeight).toBeLessThanOrEqual(WRAPPED_SHAPE.quarter.barHeight)
    expect(WRAPPED_SHAPE.quarter.barHeight).toBeLessThanOrEqual(WRAPPED_SHAPE.month.barHeight)
    expect(WRAPPED_SHAPE.year.minCell).toBeLessThanOrEqual(WRAPPED_SHAPE.quarter.minCell)
    expect(WRAPPED_SHAPE.quarter.minCell).toBeLessThanOrEqual(WRAPPED_SHAPE.month.minCell)
  })

  it('keeps the year within a third of the month rather than a third of its height', () => {
    expect(WRAPPED_SHAPE.year.barHeight / WRAPPED_SHAPE.month.barHeight).toBeGreaterThan(0.5)
    expect(WRAPPED_SHAPE.year.minCell / WRAPPED_SHAPE.month.minCell).toBeGreaterThan(0.5)
  })

  it.each(SCALES)('asks the %s row for the height its single lane really needs', (scale) => {
    const shape = WRAPPED_SHAPE[scale]
    expect(
      wrappedRowHeight(shape.minCell, shape.barHeight, 1, shape.maxBar),
    ).toBeGreaterThanOrEqual(shape.barHeight)
  })
})
