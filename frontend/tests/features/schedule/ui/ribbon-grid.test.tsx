import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { ribbonWindow } from '@/features/schedule/model/ribbon/ribbon-window'
import { SCHEDULE_SCALES } from '@/features/schedule/model/schedule-scale'
import { RibbonGrid } from '@/features/schedule/ui/ribbon/ribbon-grid'
import { WEEK_HOUR_HEIGHT } from '@/features/schedule/ui/week-grid/week-layout'
import type { ScheduleResponse } from '@/shared/api/types.gen'

const NOW = new Date(2026, 2, 4, 12, 0, 0)

const data: ScheduleResponse = {
  range: { from: '2025-11-01T00:00:00Z', to: '2026-12-01T00:00:00Z' },
  rows: [
    {
      event_id: 'hack',
      title: 'Long Hackathon',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-03-02T09:00:00+03:00',
      end_at: '2026-03-09T18:00:00+03:00',
      effective_format: 'ONLINE',
      stages: [],
    },
    {
      event_id: 'meetup',
      title: 'Evening Meetup',
      kind: 'MEETUP',
      state: 'UPCOMING',
      start_at: '2026-03-05T18:30:00+03:00',
      end_at: '2026-03-05T20:30:00+03:00',
      effective_format: 'ONLINE',
      stages: [],
    },
  ],
}

function renderRibbon(response: ScheduleResponse = data) {
  return renderWithProviders(
    <RibbonGrid data={response} window={ribbonWindow(NOW, 0)} locale={enUS} now={NOW} />,
  )
}

function within(container: HTMLElement, selector: string): HTMLElement[] {
  return [...container.querySelectorAll(selector)].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

describe('the ribbon is offered as a scale of its own', () => {
  it('is the last scale, after the year', () => {
    expect(SCHEDULE_SCALES.at(-1)).toBe('all')
    expect(SCHEDULE_SCALES.indexOf('all')).toBeGreaterThan(SCHEDULE_SCALES.indexOf('year'))
  })
})

describe('the ribbon puts the long events above and the short ones on the hours', () => {
  it('draws the week-long hackathon on the upper band', () => {
    const { container } = renderRibbon()
    const band = container.querySelector('[data-ribbon-band]')

    expect(band).not.toBeNull()
    expect(within(band as HTMLElement, '[data-schedule-item="hack"]')).toHaveLength(1)
  })

  it('draws the two-hour meetup on the hour track, not on the band', () => {
    const { container } = renderRibbon()
    const hours = container.querySelector('[data-ribbon-hours]')
    const band = container.querySelector('[data-ribbon-band]')

    expect(within(hours as HTMLElement, '[data-schedule-item="meetup"]')).toHaveLength(1)
    expect(within(band as HTMLElement, '[data-schedule-item="meetup"]')).toHaveLength(0)
  })

  it('gives the short event a top that reflects its hour rather than the top of the track', () => {
    const { container } = renderRibbon()
    const bar = container
      .querySelector('[data-schedule-item="meetup"]')
      ?.closest('[data-event-color]') as HTMLElement | null

    expect(bar).not.toBeNull()
    expect(Number.parseFloat(bar?.style.top ?? '0')).toBeGreaterThan(0)
  })
})

describe('the lower tier carries a real hour scale, like the week view', () => {
  it('labels its hours instead of leaving the bars on a blank band', () => {
    const { container } = renderRibbon()

    expect(within(container, '[data-ribbon-hour]').length).toBeGreaterThan(1)
  })

  it('writes every hour label as a two-digit hour and minute', () => {
    const { container } = renderRibbon()

    for (const label of within(container, '[data-ribbon-hour]')) {
      expect(label.textContent).toMatch(/^\d{2}:00$/)
    }
  })

  it('rules a gridline for every labelled hour, so a bar can be read against it', () => {
    const { container } = renderRibbon()

    expect(within(container, '[data-ribbon-hour-line]')).toHaveLength(
      within(container, '[data-ribbon-hour]').length,
    )
  })

  it('spaces the hours on the same rhythm the week view uses', () => {
    const { container } = renderRibbon()
    const tops = within(container, '[data-ribbon-hour]').map((label) =>
      Number.parseFloat(label.style.top),
    )

    expect(tops.length).toBeGreaterThan(1)
    for (let index = 1; index < tops.length; index += 1) {
      expect((tops[index] ?? 0) - (tops[index - 1] ?? 0)).toBe(WEEK_HOUR_HEIGHT)
    }
  })

  it('places an evening meetup below the hour it starts after', () => {
    const { container } = renderRibbon()
    const bar = container
      .querySelector('[data-schedule-item="meetup"]')
      ?.closest('[data-event-color]') as HTMLElement | null
    const noon = within(container, '[data-ribbon-hour]').find(
      (label) => label.dataset.ribbonHour === '12',
    )

    expect(Number.parseFloat(bar?.style.top ?? '0')).toBeGreaterThan(
      Number.parseFloat(noon?.style.top ?? '0'),
    )
  })
})

describe('the ribbon always carries an hour scale, even with nothing timed to show', () => {
  it('draws the hour track when a short event needs it', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-hours]')).not.toBeNull()
  })

  it('keeps the hour track standing when every event in the window is multi-day', () => {
    const { container } = renderRibbon({
      ...data,
      rows: data.rows.filter((entry) => entry.event_id === 'hack'),
    })

    expect(container.querySelector('[data-ribbon-band]')).not.toBeNull()
    expect(container.querySelector('[data-ribbon-hours]')).not.toBeNull()
  })

  it('gives the empty hour track the same height as one holding an event', () => {
    const full = renderRibbon()
    const empty = renderRibbon({
      ...data,
      rows: data.rows.filter((entry) => entry.event_id === 'hack'),
    })

    const fullHours = full.container.querySelector<HTMLElement>('[data-ribbon-hours]')
    const emptyHours = empty.container.querySelector<HTMLElement>('[data-ribbon-hours]')

    expect(emptyHours?.style.getPropertyValue('--ribbon-hour-track')).toBe(
      fullHours?.style.getPropertyValue('--ribbon-hour-track'),
    )
  })
})

describe('the ribbon says where in the year the reader is', () => {
  it('bands the ground by season', () => {
    const { container } = renderRibbon()

    expect(within(container, '[data-ribbon-season]').length).toBeGreaterThan(1)
  })

  it('rules the ribbon by month so a long scroll keeps its bearings', () => {
    const { container } = renderRibbon()

    expect(within(container, '[data-ribbon-month]').length).toBeGreaterThan(6)
  })

  it('draws no strip of its own beneath the hours, where the season should show through', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-density]')).toBeNull()
  })

  it('names the season the reader is looking at', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-marker]')).not.toBeNull()
  })

  it('marks the present', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-now]')).not.toBeNull()
  })
})

describe('the ribbon leaves period navigation to the one bar that owns it', () => {
  it('draws no second set of earlier, later and present controls', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-earlier]')).toBeNull()
    expect(container.querySelector('[data-ribbon-later]')).toBeNull()
    expect(container.querySelector('[data-ribbon-today]')).toBeNull()
  })

  it('still names the season it is showing, which no other bar carries', () => {
    const { container } = renderRibbon()

    expect(container.querySelector('[data-ribbon-marker]')).not.toBeNull()
  })
})
