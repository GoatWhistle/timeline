import { describe, expect, it } from 'vitest'
import {
  decideIndicator,
  holdUntil,
  SKELETON_DELAY_MS,
  SKELETON_MIN_MS,
  SPINNER_DELAY_MS,
} from '@/shared/ui/states'

describe('nothing under 200ms', () => {
  it('shows nothing while a known-shape load is still under the threshold', () => {
    expect(decideIndicator({ isPending: true, shape: 'known', elapsedMs: 0 })).toBe('none')
    expect(decideIndicator({ isPending: true, shape: 'known', elapsedMs: 199 })).toBe('none')
  })

  it('shows nothing while an unknown-shape load is under 400ms', () => {
    expect(decideIndicator({ isPending: true, shape: 'unknown', elapsedMs: 399 })).toBe('none')
  })

  it('shows nothing at all for a response that resolves immediately', () => {
    expect(decideIndicator({ isPending: false, elapsedMs: 50 })).toBe('none')
  })
})

describe('known shape gets a skeleton', () => {
  it('shows the skeleton exactly at the 200ms threshold', () => {
    expect(decideIndicator({ isPending: true, shape: 'known', elapsedMs: SKELETON_DELAY_MS })).toBe(
      'skeleton',
    )
  })

  it('keeps the skeleton while the load continues', () => {
    expect(decideIndicator({ isPending: true, shape: 'known', elapsedMs: 5000 })).toBe('skeleton')
  })

  it('never shows a spinner for a known shape', () => {
    expect(decideIndicator({ isPending: true, shape: 'known', elapsedMs: 5000 })).not.toBe(
      'spinner',
    )
  })
})

describe('unknown shape gets a spinner, but late', () => {
  it('shows the spinner exactly at the 400ms threshold', () => {
    expect(
      decideIndicator({ isPending: true, shape: 'unknown', elapsedMs: SPINNER_DELAY_MS }),
    ).toBe('spinner')
  })

  it('never shows a skeleton for an unknown shape', () => {
    expect(decideIndicator({ isPending: true, shape: 'unknown', elapsedMs: 5000 })).not.toBe(
      'skeleton',
    )
  })
})

describe('refetch keeps old data dimmed', () => {
  it('dims existing data while refetching', () => {
    expect(
      decideIndicator({ isPending: false, isFetching: true, hasData: true, elapsedMs: 0 }),
    ).toBe('stale')
  })

  it('shows data plainly when not refetching', () => {
    expect(
      decideIndicator({ isPending: false, isFetching: false, hasData: true, elapsedMs: 0 }),
    ).toBe('none')
  })

  it('never replaces visible data with a skeleton', () => {
    expect(
      decideIndicator({
        isPending: true,
        isFetching: true,
        hasData: true,
        shape: 'known',
        elapsedMs: 5000,
      }),
    ).toBe('stale')
  })
})

describe('minimum 300ms once shown', () => {
  it('holds the skeleton when the load resolved too fast after it appeared', () => {
    expect(
      decideIndicator({ isPending: false, shape: 'known', elapsedMs: 250, shownSinceMs: 40 }),
    ).toBe('skeleton')
  })

  it('holds the spinner on the same rule for an unknown shape', () => {
    expect(
      decideIndicator({ isPending: false, shape: 'unknown', elapsedMs: 450, shownSinceMs: 10 }),
    ).toBe('spinner')
  })

  it('releases once the minimum has elapsed', () => {
    expect(
      decideIndicator({
        isPending: false,
        shape: 'known',
        elapsedMs: 600,
        shownSinceMs: SKELETON_MIN_MS,
      }),
    ).toBe('none')
  })

  it('does not hold anything that was never shown', () => {
    expect(
      decideIndicator({ isPending: false, shape: 'known', elapsedMs: 100, shownSinceMs: null }),
    ).toBe('none')
  })
})

describe('holdUntil', () => {
  it('asks for the remainder of the minimum when the skeleton flashed', () => {
    expect(holdUntil(1000, 1100)).toBe(200)
  })

  it('asks for no extra hold once the minimum has passed', () => {
    expect(holdUntil(1000, 1400)).toBe(0)
    expect(holdUntil(1000, 1000 + SKELETON_MIN_MS)).toBe(0)
  })
})
