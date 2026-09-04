import { describe, expect, it } from 'vitest'
import { type DayState, dayClassName } from '@/shared/ui/forms/calendar/calendar-day'

const day: DayState = {
  date: '2026-05-13',
  dayOfMonth: 13,
  outside: false,
  today: false,
  selected: false,
  rangeStart: false,
  rangeEnd: false,
  inRange: false,
  disabled: false,
}

describe('a calendar day stays tappable on a phone', () => {
  it('sizes the day to the tap target and only shrinks it from the small breakpoint up', () => {
    const className = dayClassName(day)

    expect(className).toContain('size-tap')
    expect(className).toContain('sm:size-9')
  })

  it('keeps the tap size whatever state the day is in', () => {
    for (const state of [
      { ...day, selected: true },
      { ...day, disabled: true },
      { ...day, outside: true },
      { ...day, rangeStart: true, rangeEnd: false },
    ]) {
      expect(dayClassName(state)).toContain('size-tap')
    }
  })
})
