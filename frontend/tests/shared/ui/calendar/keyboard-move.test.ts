import { describe, expect, it } from 'vitest'
import { resolveKey } from '@/shared/ui/forms/calendar/keyboard-move'

const FREE = {}

function move(key: string, from = '2026-05-13', shift = false, bounds = FREE) {
  return resolveKey(key, shift, from, bounds)
}

describe('the calendar answers the keyboard', () => {
  it('moves by a day with the horizontal arrows', () => {
    expect(move('ArrowLeft')).toEqual({ kind: 'move', date: '2026-05-12' })
    expect(move('ArrowRight')).toEqual({ kind: 'move', date: '2026-05-14' })
  })

  it('moves by a week with the vertical arrows', () => {
    expect(move('ArrowUp')).toEqual({ kind: 'move', date: '2026-05-06' })
    expect(move('ArrowDown')).toEqual({ kind: 'move', date: '2026-05-20' })
  })

  it('moves by a month with PageUp and PageDown', () => {
    expect(move('PageUp')).toEqual({ kind: 'move', date: '2026-04-13' })
    expect(move('PageDown')).toEqual({ kind: 'move', date: '2026-06-13' })
  })

  it('moves by a year when Shift is held', () => {
    expect(move('PageUp', '2026-05-13', true)).toEqual({ kind: 'move', date: '2025-05-13' })
    expect(move('PageDown', '2026-05-13', true)).toEqual({ kind: 'move', date: '2027-05-13' })
  })

  it('jumps to the bounds of the week with Home and End', () => {
    expect(move('Home')).toEqual({ kind: 'move', date: '2026-05-11' })
    expect(move('End')).toEqual({ kind: 'move', date: '2026-05-17' })
  })

  it('lands on a real day when the next month is shorter', () => {
    expect(move('PageDown', '2026-01-31')).toEqual({ kind: 'move', date: '2026-02-28' })
  })

  it('picks the focused day with Enter and Space', () => {
    expect(move('Enter')).toEqual({ kind: 'select' })
    expect(move(' ')).toEqual({ kind: 'select' })
  })

  it('closes with Escape', () => {
    expect(move('Escape')).toEqual({ kind: 'close' })
  })

  it('ignores keys it does not own so typing still reaches the page', () => {
    expect(move('a')).toBeNull()
    expect(move('Tab')).toBeNull()
    expect(move('Shift')).toBeNull()
  })
})

describe('the keyboard never walks out of the allowed range', () => {
  const bounds = { min: '2026-05-10', max: '2026-05-20' }

  it('stops at the minimum instead of stepping past it', () => {
    expect(move('ArrowLeft', '2026-05-10', false, bounds)).toEqual({
      kind: 'move',
      date: '2026-05-10',
    })
  })

  it('stops at the maximum instead of stepping past it', () => {
    expect(move('ArrowRight', '2026-05-20', false, bounds)).toEqual({
      kind: 'move',
      date: '2026-05-20',
    })
  })

  it('clamps a month jump back into the allowed range', () => {
    expect(move('PageDown', '2026-05-15', false, bounds)).toEqual({
      kind: 'move',
      date: '2026-05-20',
    })
    expect(move('PageUp', '2026-05-15', false, bounds)).toEqual({
      kind: 'move',
      date: '2026-05-10',
    })
  })
})
