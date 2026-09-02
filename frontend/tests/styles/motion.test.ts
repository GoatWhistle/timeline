import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8')
}

const RESET = source('src/styles/reset.css')
const MOTION = source('src/styles/tokens/motion.css')

const ANIMATED_SURFACES = [
  'src/shared/ui/overlays/dialog.tsx',
  'src/shared/ui/overlays/tooltip.tsx',
  'src/shared/ui/forms/select.tsx',
  'src/features/profile-menu/profile-menu.tsx',
  'src/features/settings-overlay/settings-overlay.tsx',
  'src/features/event-feed-bell/event-feed-bell.tsx',
  'src/app/sidebar/app-sidebar.tsx',
  'src/features/event-overlay-card/event-overlay-card.tsx',
  'src/features/batch-result-panel/batch-result-panel.tsx',
]

describe('reduced motion', () => {
  it('the reset silences animation, transition and scrolling', () => {
    const block = RESET.slice(RESET.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(block).toContain('animation-duration: 0.01ms !important')
    expect(block).toContain('animation-iteration-count: 1 !important')
    expect(block).toContain('transition-duration: 0.01ms !important')
    expect(block).toContain('scroll-behavior: auto !important')
  })

  it('the busy indicator keeps turning at a constant rate instead of freezing', () => {
    const block = RESET.slice(RESET.indexOf('[data-busy-spin]'))
    expect(block).toContain('animation-name: spin !important')
    expect(block).toContain('animation-iteration-count: infinite !important')
    expect(block).toContain('animation-timing-function: var(--ease-linear) !important')
  })

  it('every entrance and exit animation is gated behind motion-safe', () => {
    for (const file of ANIMATED_SURFACES) {
      const text = source(file)
      for (const match of text.matchAll(/(?<!motion-safe:)\banimate-(in|out)\b/g)) {
        const start = Math.max(0, match.index - 40)
        throw new Error(
          `${file}: ungated animate-${match[1]} near "${text.slice(start, match.index + 20)}"`,
        )
      }
      for (const match of text.matchAll(/(?<!motion-safe:)\btransition-\[/g)) {
        const start = Math.max(0, match.index - 40)
        throw new Error(`${file}: ungated transition near "${text.slice(start, match.index + 20)}"`)
      }
      expect(text).toMatch(/motion-safe:(animate-(in|out)|transition-)/)
    }
  })
})

describe('motion tokens', () => {
  it('declares the easing and duration scale', () => {
    for (const token of ['--ease-out', '--ease-in', '--ease-in-out', '--ease-linear']) {
      expect(MOTION).toContain(`${token}:`)
    }
    for (const token of [
      '--duration-instant',
      '--duration-fast',
      '--duration-fast-exit',
      '--duration-base',
      '--duration-base-exit',
      '--duration-panel',
    ]) {
      expect(MOTION).toContain(`${token}:`)
    }
  })

  it('easing decelerates on entry and accelerates on exit', () => {
    expect(MOTION).toContain('--ease-out: cubic-bezier(0.22, 1, 0.36, 1)')
    expect(MOTION).toContain('--ease-in: cubic-bezier(0.64, 0, 0.78, 0)')
    expect(MOTION).toContain('--ease-linear: linear')
  })

  it('exits are faster than the entrances they mirror', () => {
    const read = (name: string): number => {
      const found = MOTION.match(new RegExp(`${name}:\\s*(\\d+)ms`))
      if (!found?.[1]) throw new Error(`${name} is not declared in ms`)
      return Number(found[1])
    }
    expect(read('--duration-fast-exit')).toBeLessThan(read('--duration-fast'))
    expect(read('--duration-base-exit')).toBeLessThan(read('--duration-base'))
  })

  it('every animated surface picks a duration and an easing from the scale', () => {
    for (const file of ANIMATED_SURFACES) {
      const text = source(file)
      expect(text, `${file} animates without a duration token`).toMatch(
        /motion-safe:duration-(instant|fast|fast-exit|base|base-exit|panel|zoom|slow)/,
      )
      expect(text, `${file} animates without an easing token`).toMatch(
        /motion-safe:ease-(out|in|in-out|linear)/,
      )
    }
  })
})
