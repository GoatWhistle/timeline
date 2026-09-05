import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { swapDirection } from '@/features/schedule/model/use-swap-direction'
import { ViewSwap } from '@/features/schedule/ui/view-swap/view-swap'

const STYLES = readFileSync(
  join(process.cwd(), 'src/features/schedule/ui/view-swap/view-swap.module.css'),
  'utf8',
)

const DIRECTIONS = ['scale', 'forward', 'back'] as const

describe('the schedule tells one view from the next', () => {
  it('remounts the pane when the scale changes, so the entry runs again', () => {
    const { container, rerender } = render(
      <ViewSwap token="month:0" direction="scale">
        <p>grid</p>
      </ViewSwap>,
    )
    const first = container.querySelector('[data-schedule-swap]')

    rerender(
      <ViewSwap token="year:0" direction="scale">
        <p>grid</p>
      </ViewSwap>,
    )
    const second = container.querySelector('[data-schedule-swap]')

    expect(first).not.toBe(second)
    expect(second?.getAttribute('data-schedule-swap')).toBe('year:0')
  })

  it('keeps the same pane while nothing about the period changed', () => {
    const { container, rerender } = render(
      <ViewSwap token="month:0" direction="scale">
        <p>grid</p>
      </ViewSwap>,
    )
    const first = container.querySelector('[data-schedule-swap]')

    rerender(
      <ViewSwap token="month:0" direction="scale">
        <p>grid</p>
      </ViewSwap>,
    )

    expect(container.querySelector('[data-schedule-swap]')).toBe(first)
  })

  it.each(DIRECTIONS)('publishes %s so the stylesheet can answer it', (direction) => {
    const { container } = render(
      <ViewSwap token="month:0" direction={direction}>
        <p>grid</p>
      </ViewSwap>,
    )
    expect(
      container.querySelector('[data-schedule-swap]')?.getAttribute('data-swap-direction'),
    ).toBe(direction)
  })
})

describe('stepping forward and back is told apart from changing the scale', () => {
  it('calls the very first view a scale change, not a step', () => {
    expect(swapDirection(undefined, { scale: 'month', offset: 0 })).toBe('scale')
  })

  it('calls a later period forward and an earlier one back', () => {
    expect(swapDirection({ scale: 'month', offset: 0 }, { scale: 'month', offset: 1 })).toBe(
      'forward',
    )
    expect(swapDirection({ scale: 'month', offset: 0 }, { scale: 'month', offset: -1 })).toBe(
      'back',
    )
  })

  it('calls a change of scale a scale change however the offset moved', () => {
    expect(swapDirection({ scale: 'month', offset: 3 }, { scale: 'year', offset: 0 })).toBe('scale')
    expect(swapDirection({ scale: 'week', offset: 0 }, { scale: 'month', offset: 9 })).toBe('scale')
  })
})

describe('the transition gets out of the way of a reader who asked for less motion', () => {
  it('puts every animation behind the reduced-motion gate', () => {
    const gate = '@media (prefers-reduced-motion: no-preference)'
    const guarded = STYLES.slice(STYLES.indexOf(gate))

    for (const match of STYLES.matchAll(/^\s*animation:/gm)) {
      expect(guarded).toContain(STYLES.slice(match.index ?? 0, (match.index ?? 0) + 12).trim())
    }
    expect(STYLES.indexOf('animation:')).toBeGreaterThan(STYLES.indexOf(gate))
  })

  it('animates only what it declares, and each direction has a frame set', () => {
    for (const direction of DIRECTIONS) {
      expect(STYLES).toContain(`data-swap-direction="${direction}"`)
    }
    for (const name of ['swap-scale', 'swap-forward', 'swap-back']) {
      expect(STYLES).toContain(`@keyframes ${name}`)
    }
  })

  it('never animates a property that would resize the frame around the grid', () => {
    expect(STYLES).not.toMatch(/@keyframes[\s\S]*?\bheight:/)
    expect(STYLES).not.toMatch(/@keyframes[\s\S]*?\bmax-height:/)
  })

  it('spends no longer than the base beat, so a quick hand is never made to wait', () => {
    for (const [, token] of STYLES.matchAll(/animation:\s*[\w-]+\s+var\((--duration-[\w-]+)\)/g)) {
      expect(['--duration-instant', '--duration-fast', '--duration-base']).toContain(token)
    }
  })
})
