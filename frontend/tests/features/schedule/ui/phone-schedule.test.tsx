import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { PhoneSchedule } from '@/features/schedule/ui/phone-agenda/phone-schedule'
import { NOW, schedule } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')

function renderPhone(props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <PhoneSchedule data={schedule} from={MONTH_FROM} months={1} now={NOW} {...props} />,
  )
}

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

describe('the phone month view keeps every day reachable', () => {
  it('renders one cell per day of the month and no calendar bars', () => {
    const { container } = renderPhone()

    expect(days(container)).toHaveLength(31)
    expect(container.querySelector('[data-schedule-item][data-kind]')).toBeNull()
  })

  it('marks a day that carries events with its own count', () => {
    const { container } = renderPhone()

    expect(dayNamed(container, '2026-0-15').dataset.scheduleDayBars).toBe('1')
    expect(dayNamed(container, '2026-0-1').dataset.scheduleDayBars).toBe('0')
  })

  it('opens the agenda of a day only once that day is chosen', () => {
    const { container } = renderPhone()

    expect(container.querySelector('[data-schedule-day-agenda]')).toBeNull()

    fireEvent.click(dayNamed(container, '2026-0-15'))

    const panel = container.querySelector('[data-schedule-day-agenda]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-schedule-day-agenda')).toBe('2026-0-15')
    expect(panel?.querySelectorAll('[data-schedule-agenda-row]')).toHaveLength(1)
  })

  it('closes the agenda when the same day is chosen again', () => {
    const { container } = renderPhone()
    const cell = dayNamed(container, '2026-0-15')

    fireEvent.click(cell)
    expect(container.querySelector('[data-schedule-day-agenda]')).not.toBeNull()

    fireEvent.click(cell)
    expect(container.querySelector('[data-schedule-day-agenda]')).toBeNull()
  })

  it('reports the chosen day to the caller when a row of its agenda is picked', () => {
    const onSelect = vi.fn()
    const { container } = renderPhone({ onSelect })

    fireEvent.click(dayNamed(container, '2026-0-15'))
    const row = container.querySelector('[data-schedule-agenda-row]')
    if (!(row instanceof HTMLElement)) throw new Error('no agenda row')
    fireEvent.click(row)

    expect(onSelect).toHaveBeenLastCalledWith('e1')
  })

  it('opens the event of a row on a double press', () => {
    const onOpenEvent = vi.fn()
    const { container } = renderPhone({ onOpenEvent })

    fireEvent.click(dayNamed(container, '2026-0-15'))
    const row = container.querySelector('[data-schedule-agenda-row]')
    if (!(row instanceof HTMLElement)) throw new Error('no agenda row')
    fireEvent.doubleClick(row)

    expect(onOpenEvent).toHaveBeenCalledTimes(1)
    expect(onOpenEvent.mock.calls[0]?.[0]).toMatchObject({ event_id: 'e1' })
  })

  it('leaves exactly one tab stop, and it sits on a day of the month', () => {
    const { container } = renderPhone()
    const stops = days(container).filter((day) => day.tabIndex === 0)

    expect(stops).toHaveLength(1)
    expect(stops[0]?.textContent?.trim()).not.toBe('')
  })

  it('shows the events of a day once Enter is pressed on its cell', () => {
    const { container } = renderPhone()
    const cell = dayNamed(container, '2026-0-15')

    cell.focus()
    fireEvent.keyDown(cell, { key: 'Enter' })

    expect(container.querySelector('[data-schedule-day-agenda]')).not.toBeNull()
  })
})

describe('the phone year view lists months instead of drawing them', () => {
  it('gives every month of the span a section of its own', () => {
    const { container } = renderWithProviders(
      <PhoneSchedule data={schedule} from={MONTH_FROM} months={12} now={NOW} />,
    )

    expect(container.querySelectorAll('[data-schedule-month]')).toHaveLength(12)
    expect(container.querySelectorAll('[data-schedule-day]')).toHaveLength(0)
  })

  it('marks a month that carries no events as empty', () => {
    const { container } = renderWithProviders(
      <PhoneSchedule data={schedule} from={MONTH_FROM} months={12} now={NOW} />,
    )

    const june = container.querySelector('[data-schedule-month="2026-5"]')
    expect(june?.getAttribute('data-empty')).toBe('true')
    expect(june?.querySelectorAll('[data-schedule-agenda-row]')).toHaveLength(0)
  })

  it('lists the events of a month that carries them', () => {
    const { container } = renderWithProviders(
      <PhoneSchedule data={schedule} from={MONTH_FROM} months={12} now={NOW} />,
    )

    const january = container.querySelector('[data-schedule-month="2026-0"]')
    expect(january?.getAttribute('data-empty')).toBe('false')
    expect(january?.querySelectorAll('[data-schedule-agenda-row]').length).toBeGreaterThan(0)
  })
})
