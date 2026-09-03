import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_COLOR_SLOTS } from '@/entities/event/event-color'
import { BAR_HEIGHT, LEGACY_BAR_HEIGHT } from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { EventColor, ScheduleResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import {
  bars,
  checkpointStage,
  gridProps,
  marks,
  NOW,
  rowWith,
  schedule,
  slots,
} from './schedule-fixtures'

const RU_COLOR: EventColor = { family: 'RU', slot: 4 }

function coloured(color: EventColor | undefined): ScheduleResponse {
  return rowWith([...(schedule.rows[0]?.stages ?? []), checkpointStage], {
    registration_deadline: '2026-01-20T00:00:00Z',
    ...(color ? { color } : {}),
  })
}

function renderGrid(data: ScheduleResponse, props: Record<string, unknown> = {}) {
  return renderWithProviders(<ScheduleGrid data={data} {...gridProps} now={NOW} {...props} />)
}

describe('schedule strips consume the event colour seam', () => {
  it('hands the API colour straight to the shared attributes', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const slot = slots(container)[0]

    expect(slot).toHaveAttribute('data-event-family', 'RU')
    expect(slot).toHaveAttribute('data-event-slot', '4')
  })

  it('falls back to the unassigned family when the API sends no colour', () => {
    const { container } = renderGrid(coloured(undefined))
    expect(slots(container)[0]).toHaveAttribute('data-event-family', 'NONE')
  })

  it('never invents a slot the palette does not define', () => {
    for (const slot of [0, 3, EVENT_COLOR_SLOTS - 1]) {
      const view = renderGrid(coloured({ family: 'WORLD', slot }))
      expect(slots(view.container)[0]).toHaveAttribute('data-event-slot', String(slot))
      view.unmount()
    }
  })

  it('rejects a slot outside the palette rather than painting it', () => {
    const { container } = renderGrid(coloured({ family: 'RU', slot: EVENT_COLOR_SLOTS }))
    expect(slots(container)[0]).toHaveAttribute('data-event-family', 'NONE')
  })

  it('carries no hardcoded colour of its own on the strip', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const slot = slots(container)[0]
    expect(slot?.getAttribute('style') ?? '').not.toMatch(/#[0-9a-f]{3,8}|oklch\(|rgb\(/i)
  })

  it('tints a checkpoint by the event it belongs to, not by a colour of its own', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const checkpoint = marks(container).find((mark) => mark.dataset.moment === 'checkpoint')
    const owner = checkpoint?.closest('[data-event-color]')

    expect(owner).toHaveAttribute('data-event-family', 'RU')
    expect(checkpoint?.getAttribute('style') ?? '').not.toMatch(/#[0-9a-f]{3,8}|oklch\(/i)
  })
})

describe('schedule strips carry more than colour', () => {
  it('stands at least twice as tall as the strips it replaces', () => {
    for (const scale of ['week', 'month', 'quarter'] as const) {
      expect(BAR_HEIGHT[scale]).toBeGreaterThanOrEqual(2 * LEGACY_BAR_HEIGHT[scale])
    }
  })

  it('names the event, its dates and its registration state in text', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const text = bars(container)[0]?.textContent ?? ''

    expect(text).toContain('Winter Hackathon')
    expect(text).toContain('2026')
    expect(text.length).toBeGreaterThan('Winter Hackathon'.length + 10)
  })

  it('says which stage is current instead of leaving the strip a bare bar', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const text = bars(container)[0]?.textContent ?? ''
    expect(text).toContain('Participant registration')
  })

  it('pairs the colour with a shape and a screen-reader name for the family', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const bar = bars(container)[0]

    expect(bar?.querySelector('[data-event-family="RU"]')).toBeInTheDocument()
    expect(bar?.textContent).toContain(i18n.t('event:form.originValue.RU'))
  })

  it('separates a checkpoint from a deadline by fill, not by tint', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const hollow = marks(container).map((mark) => mark.dataset.hollow)

    expect(hollow).toContain('true')
    expect(hollow).toContain('false')
  })

  it('keeps no bottom legend now that the strips explain themselves', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })
})

describe('schedule strips open without a hover', () => {
  it('opens the event on a plain click, with no pointer ever hovering', async () => {
    const onNavigate = vi.fn()
    const { container, user } = renderGrid(coloured(RU_COLOR), { onNavigate })
    const bar = bars(container)[0]

    if (bar) await user.click(bar)
    expect(onNavigate).toHaveBeenCalledWith('/events/e1')
  })

  it('prefers the shared event card over navigation when one is supplied', async () => {
    const onOpenEvent = vi.fn()
    const onNavigate = vi.fn()
    const { container, user } = renderGrid(coloured(RU_COLOR), { onOpenEvent, onNavigate })
    const bar = bars(container)[0]

    if (bar) await user.click(bar)
    expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'e1' }))
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('opens a checkpoint popover on a plain click', async () => {
    const { container, user } = renderGrid(coloured(RU_COLOR))
    const checkpoint = marks(container).find((mark) => mark.dataset.moment === 'checkpoint')

    if (checkpoint) await user.click(checkpoint)
    expect(findPopover()).toBeInTheDocument()
  })

  it('reaches the event from inside the checkpoint popover', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderGrid(coloured(RU_COLOR), { onOpenEvent })
    const checkpoint = marks(container).find((mark) => mark.dataset.moment === 'checkpoint')

    if (checkpoint) await user.click(checkpoint)
    const action = document.querySelector('[data-schedule-moment-open]')
    if (action instanceof HTMLElement) await user.click(action)

    expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'e1' }))
  })
})

describe('schedule strips answer the keyboard', () => {
  it('opens the focused strip on Enter without any pointer', async () => {
    const onNavigate = vi.fn()
    const { container, user } = renderGrid(coloured(RU_COLOR), { onNavigate })
    focusCalendar(container)

    await user.keyboard('{Enter}')
    expect(onNavigate).toHaveBeenCalledWith('/events/e1')
  })

  it('steps onto a checkpoint of the focused strip and focuses it', async () => {
    const { container, user } = renderGrid(coloured(RU_COLOR))
    focusCalendar(container)

    await user.keyboard('n')
    expect(document.activeElement).toHaveAttribute('data-schedule-mark')
  })

  it('opens the focused checkpoint from the keyboard alone', async () => {
    const { container, user } = renderGrid(coloured(RU_COLOR))
    focusCalendar(container)

    await user.keyboard('n')
    await user.keyboard(' ')
    expect(findPopover()).toBeInTheDocument()
  })

  it('gives every checkpoint a role and an accessible name, not a bare div', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    const found = marks(container)

    expect(found.length).toBeGreaterThan(0)
    for (const mark of found) {
      expect(mark.tagName).toBe('BUTTON')
      expect(mark.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('gives every strip a role and an accessible name, not a bare div', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    for (const bar of bars(container)) {
      expect(bar.tagName).toBe('BUTTON')
      expect(bar.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('keeps the calendar to one tab stop rather than a mark per checkpoint', () => {
    const { container } = renderGrid(coloured(RU_COLOR))
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })
})

function findPopover(): HTMLElement | undefined {
  const found = document.querySelector('[data-schedule-moment-popover]')
  return found instanceof HTMLElement ? found : undefined
}

function focusCalendar(container: HTMLElement): void {
  const viewport = [...container.querySelectorAll('[data-schedule-viewport]')].find(
    (element) => element instanceof HTMLElement && element.tabIndex === 0,
  )
  if (viewport instanceof HTMLElement) viewport.focus()
}
