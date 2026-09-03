import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_COLOR_SLOTS } from '@/entities/event/event-color'
import { WRAPPED_SHAPE } from '@/features/schedule/model/schedule-scale'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import type { EventColor, ScheduleResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import {
  bars,
  NOW,
  rowWith,
  schedule,
  slots,
  WEEK_FROM,
  WEEK_TO,
  weekLocale,
} from './schedule-fixtures'

const RU_COLOR: EventColor = { family: 'RU', slot: 4 }
const MONTH_FROM = new Date('2026-01-01T00:00:00')

function coloured(color: EventColor | undefined): ScheduleResponse {
  return rowWith(schedule.rows[0]?.stages ?? [], {
    start_at: '2026-01-13T09:00:00Z',
    end_at: '2026-01-15T18:00:00Z',
    registration_deadline: '2026-01-14T00:00:00Z',
    ...(color ? { color } : {}),
  })
}

function renderMonth(data: ScheduleResponse, props: Record<string, unknown> = {}) {
  const shape = WRAPPED_SHAPE.month
  return renderWithProviders(
    <WrappedGrid
      data={data}
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

function renderWeek(data: ScheduleResponse, props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <WeekGrid data={data} from={WEEK_FROM} to={WEEK_TO} locale={weekLocale} now={NOW} {...props} />,
  )
}

describe('schedule strips consume the event colour seam', () => {
  it('hands the API colour straight to the shared attributes', () => {
    const { container } = renderMonth(coloured(RU_COLOR))
    const slot = slots(container)[0]

    expect(slot).toHaveAttribute('data-event-family', 'RU')
    expect(slot).toHaveAttribute('data-event-slot', '4')
  })

  it('falls back to the unassigned family when the API sends no colour', () => {
    const { container } = renderMonth(coloured(undefined))
    expect(slots(container)[0]).toHaveAttribute('data-event-family', 'NONE')
  })

  it('never invents a slot the palette does not define', () => {
    for (const slot of [0, 3, EVENT_COLOR_SLOTS - 1]) {
      const view = renderMonth(coloured({ family: 'WORLD', slot }))
      expect(slots(view.container)[0]).toHaveAttribute('data-event-slot', String(slot))
      view.unmount()
    }
  })

  it('rejects a slot outside the palette rather than painting it', () => {
    const { container } = renderMonth(coloured({ family: 'RU', slot: EVENT_COLOR_SLOTS }))
    expect(slots(container)[0]).toHaveAttribute('data-event-family', 'NONE')
  })

  it('carries no hardcoded colour of its own on the strip', () => {
    const { container } = renderMonth(coloured(RU_COLOR))
    const slot = slots(container)[0]
    expect(slot?.getAttribute('style') ?? '').not.toMatch(/#[0-9a-f]{3,8}|oklch\(|rgb\(/i)
  })

  it('carries the same colour seam in the week view', () => {
    const { container } = renderWeek(coloured(RU_COLOR))
    const slot = slots(container)[0]

    expect(slot).toHaveAttribute('data-event-family', 'RU')
    expect(slot).toHaveAttribute('data-event-slot', '4')
  })
})

describe('schedule strips carry more than colour', () => {
  it('names the event and its registration state in text', () => {
    const { container } = renderWeek(coloured(RU_COLOR))
    const text = bars(container)[0]?.textContent ?? ''

    expect(text).toContain('Winter Hackathon')
    expect(text.length).toBeGreaterThan('Winter Hackathon'.length)
  })

  it('says which stage is current in the accessible sentence', () => {
    const { container } = renderWeek(coloured(RU_COLOR))
    expect(bars(container)[0]?.getAttribute('aria-label')).toContain('Participant registration')
  })

  it('pairs the colour with a screen-reader name for the family', () => {
    const { container } = renderWeek(coloured(RU_COLOR))
    const bar = bars(container)[0]

    expect(bar?.querySelector('[data-event-family="RU"]')).toBeInTheDocument()
    expect(bar?.textContent).toContain(i18n.t('event:form.originValue.RU'))
  })

  it('keeps no bottom legend now that the strips explain themselves', () => {
    const { container } = renderMonth(coloured(RU_COLOR))
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })
})

describe('schedule strips answer the pointer without a hover', () => {
  it('selects the event on a plain click, with no pointer ever hovering', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(coloured(RU_COLOR), { onSelect })
    const bar = bars(container)[0]

    if (bar) await user.click(bar)
    expect(onSelect).toHaveBeenCalledWith('e1')
  })

  it('opens the shared event card on the second gesture', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderMonth(coloured(RU_COLOR), { onOpenEvent })
    const bar = bars(container)[0]

    if (bar) await user.dblClick(bar)
    expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'e1' }))
  })

  it('gives every strip a button role and an accessible name, not a bare div', () => {
    const { container } = renderMonth(coloured(RU_COLOR))
    const found = bars(container)

    expect(found.length).toBeGreaterThan(0)
    for (const bar of found) {
      expect(bar.tagName).toBe('BUTTON')
      expect(bar.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('keeps the wrapped calendar to one tab stop rather than a stop per strip', () => {
    const { container } = renderMonth(coloured(RU_COLOR))
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })
})
