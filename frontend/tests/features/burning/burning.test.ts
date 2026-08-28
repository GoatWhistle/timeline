import { describe, expect, it } from 'vitest'
import {
  buildBurning,
  compareByUrgency,
  DEFAULT_FILTERS,
  isActionable,
  toBurningItem,
} from '@/features/burning/model/burning'
import { isQuiet, summarize } from '@/features/burning/model/burning-summary'
import { event, events, NOW } from './burning-fixtures'

describe('toBurningItem', () => {
  it('names the deadline as the reason whenever a level is pressing', () => {
    const item = toBurningItem(event({ id: 'a', deadlineHours: 3 }), NOW)
    expect(item.urgency).toBe('today')
    expect(item.reason).toBe('deadline')
  })

  it('names a running event when nothing presses', () => {
    const item = toBurningItem(event({ id: 'a', state: 'ACTIVE', deadlineHours: null }), NOW)
    expect(item.reason).toBe('running')
  })

  it('names an event starting inside the week', () => {
    const item = toBurningItem(
      event({ id: 'a', state: 'UPCOMING', startDays: 3, deadlineHours: null }),
      NOW,
    )
    expect(item.reason).toBe('starting')
  })

  it('names nothing for an event starting beyond the week', () => {
    const item = toBurningItem(
      event({ id: 'a', state: 'UPCOMING', startDays: 40, deadlineHours: null }),
      NOW,
    )
    expect(item.reason).toBe('none')
  })
})

describe('isActionable', () => {
  it('holds only for an unmarked registration on an open event', () => {
    expect(isActionable(event({ id: 'a', state: 'UPCOMING' }), 'TODO')).toBe(true)
  })

  it('does not hold once the participant has marked the registration', () => {
    expect(isActionable(event({ id: 'a', state: 'UPCOMING' }), 'DONE')).toBe(false)
  })

  it('does not hold when an administrator waived the registration', () => {
    expect(isActionable(event({ id: 'a', state: 'UPCOMING' }), 'NOT_REQUIRED')).toBe(false)
  })

  it('does not hold on a finished or archived event', () => {
    expect(isActionable(event({ id: 'a', state: 'FINISHED' }), 'TODO')).toBe(false)
    expect(isActionable(event({ id: 'a', state: 'ARCHIVED' }), 'TODO')).toBe(false)
  })

  it('does not hold without a registration status at all', () => {
    expect(isActionable(event({ id: 'a', state: 'ACTIVE' }), null)).toBe(false)
  })
})

describe('buildBurning ordering', () => {
  it('puts the most pressing level first by default', () => {
    const built = buildBurning(events(), DEFAULT_FILTERS, NOW)
    expect(built.map((item) => item.urgency)).toEqual([
      'overdue',
      'today',
      'soon',
      'calm',
      'done',
      'waived',
    ])
  })

  it('breaks a tie inside one level by the nearer deadline', () => {
    const near = toBurningItem(event({ id: 'near', deadlineHours: 30 }), NOW)
    const far = toBurningItem(event({ id: 'far', deadlineHours: 120 }), NOW)
    expect(compareByUrgency(near, far)).toBeLessThan(0)
    expect(compareByUrgency(far, near)).toBeGreaterThan(0)
  })

  it('is a stable total order on identical anchors', () => {
    const a = toBurningItem(event({ id: 'aaa', deadlineHours: 30 }), NOW)
    const b = toBurningItem(event({ id: 'bbb', deadlineHours: 30 }), NOW)
    expect(compareByUrgency(a, b)).toBeLessThan(0)
    expect(compareByUrgency(a, a)).toBe(0)
  })

  it('sorts by start date when asked to', () => {
    const built = buildBurning(events(), { ...DEFAULT_FILTERS, sort: 'start' }, NOW)
    const starts = built.map((item) => new Date(item.event.start_at).getTime())
    expect(starts).toEqual([...starts].sort((x, y) => x - y))
  })
})

describe('buildBurning filters', () => {
  it('hides finished and archived events while active only is on', () => {
    const built = buildBurning(events(), DEFAULT_FILTERS, NOW)
    expect(built.some((item) => item.event.state === 'FINISHED')).toBe(false)
    expect(built.some((item) => item.event.state === 'ARCHIVED')).toBe(false)
  })

  it('shows the closed events once active only is off', () => {
    const built = buildBurning(events(), { ...DEFAULT_FILTERS, activeOnly: false }, NOW)
    expect(built.some((item) => item.event.state === 'FINISHED')).toBe(true)
  })

  it('keeps only unmarked registrations under needs action', () => {
    const built = buildBurning(events(), { ...DEFAULT_FILTERS, needsAction: true }, NOW)
    expect(built.length).toBeGreaterThan(0)
    for (const item of built) {
      expect(item.status).toBe('TODO')
      expect(item.actionable).toBe(true)
    }
  })

  it('never invents rows the source did not carry', () => {
    const source = events()
    const built = buildBurning(source, { ...DEFAULT_FILTERS, activeOnly: false }, NOW)
    expect(built).toHaveLength(source.length)
  })
})

describe('summarize', () => {
  it('counts each pressing level separately', () => {
    const summary = summarize(buildBurning(events(), DEFAULT_FILTERS, NOW))
    expect(summary.overdue).toBe(1)
    expect(summary.today).toBe(1)
    expect(summary.soon).toBe(1)
  })

  it('counts a waiver as neither actionable nor pressing', () => {
    const waived = buildBurning(
      [event({ id: 'w', status: 'NOT_REQUIRED', deadlineHours: -50 })],
      DEFAULT_FILTERS,
      NOW,
    )
    const summary = summarize(waived)
    expect(summary.actionable).toBe(0)
    expect(summary.overdue).toBe(0)
    expect(isQuiet(summary)).toBe(true)
  })

  it('reports a quiet screen only when nothing presses', () => {
    expect(isQuiet(summarize(buildBurning(events(), DEFAULT_FILTERS, NOW)))).toBe(false)
  })
})
