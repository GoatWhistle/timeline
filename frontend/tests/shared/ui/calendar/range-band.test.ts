import { describe, expect, it } from 'vitest'
import { type DayState, dayClassName } from '@/shared/ui/forms/calendar/calendar-day'

const PLAIN: DayState = {
  date: '2026-05-10',
  dayOfMonth: 10,
  outside: false,
  today: false,
  selected: false,
  rangeStart: false,
  rangeEnd: false,
  inRange: false,
  disabled: false,
}

const day = (patch: Partial<DayState>): DayState => ({ ...PLAIN, ...patch })

const start = day({ rangeStart: true, inRange: true, selected: true })
const end = day({ rangeEnd: true, inRange: true })
const middle = day({ inRange: true })
const selectedAlone = day({ selected: true })

describe('the ends of a range are drawn from rangeStart and rangeEnd', () => {
  it('does not draw a range start exactly like a lone selected day', () => {
    expect(dayClassName(start)).not.toBe(dayClassName(selectedAlone))
  })

  it('does not draw a range end exactly like a lone selected day', () => {
    expect(dayClassName(end)).not.toBe(dayClassName(selectedAlone))
  })

  it('tells the two ends of a range apart from each other', () => {
    expect(dayClassName(start)).not.toBe(dayClassName(end))
  })

  it('squares the inner edge of each end so the run reads as one band', () => {
    expect(dayClassName(start)).toContain('rounded-r-none')
    expect(dayClassName(end)).toContain('rounded-l-none')
  })

  it('rounds the outer edge of each end rather than squaring both', () => {
    expect(dayClassName(start)).toContain('rounded-control')
    expect(dayClassName(end)).toContain('rounded-control')
  })

  it('keeps a single-day range fully rounded, with neither edge squared', () => {
    const only = day({ rangeStart: true, rangeEnd: true, inRange: true, selected: true })
    expect(dayClassName(only)).toContain('rounded-control')
    expect(dayClassName(only)).not.toContain('rounded-r-none')
    expect(dayClassName(only)).not.toContain('rounded-l-none')
  })

  it('paints both ends in the strong colour and the middle in the soft one', () => {
    expect(dayClassName(start)).toContain('bg-primary')
    expect(dayClassName(end)).toContain('bg-primary')
    expect(dayClassName(middle)).toContain('bg-accent-surface')
    expect(dayClassName(middle)).not.toContain('bg-primary')
  })

  it('reads the middle of a range as neither end', () => {
    expect(dayClassName(middle)).not.toContain('rounded-r-none')
    expect(dayClassName(middle)).not.toContain('rounded-l-none')
  })
})

describe('a day that is both today and an end of the range still reads correctly', () => {
  it('drops the underline on an end, where it would fight the filled band', () => {
    const todayStart = day({ today: true, rangeStart: true, inRange: true })
    expect(dayClassName(todayStart)).not.toContain('underline')
    expect(dayClassName(todayStart)).toContain('bg-primary')
  })

  it('leaves the dot as the only mark on a plain today, with no underline beside it', () => {
    expect(dayClassName(day({ today: true }))).not.toContain('underline')
  })

  it('adds no underline to today in the middle of a range either', () => {
    const todayMiddle = day({ today: true, inRange: true })
    expect(dayClassName(todayMiddle)).not.toContain('underline')
    expect(dayClassName(todayMiddle)).toContain('bg-accent-surface')
  })
})

describe('the foreground colour follows the band, in both themes', () => {
  it('puts the on-primary foreground on an end and the accent one in the middle', () => {
    expect(dayClassName(start)).toContain('text-primary-foreground')
    expect(dayClassName(end)).toContain('text-primary-foreground')
    expect(dayClassName(middle)).toContain('text-accent-surface-foreground')
  })

  it('never leaves an end painted without a matching foreground', () => {
    for (const state of [start, end]) {
      const classes = dayClassName(state)
      if (classes.includes('bg-primary')) {
        expect(classes).toContain('text-primary-foreground')
      }
    }
  })
})
