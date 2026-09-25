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
const THEME_TRANSITION = source('src/styles/theme-transition.css')

const SHARED_OVERLAY_MOTION = 'src/shared/ui/overlays/overlay-chrome.ts'

const ANIMATED_SURFACES = [
  SHARED_OVERLAY_MOTION,
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

function motionOf(relative: string): string {
  const text = source(relative)
  if (relative === SHARED_OVERLAY_MOTION) return text
  const borrows = /\b(SCRIM|PANEL_MOTION|FLOATING_MOTION)\b/.test(text)
  return borrows ? `${text}\n${source(SHARED_OVERLAY_MOTION)}` : text
}

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
      const text = motionOf(file)
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
    for (const token of ['--ease-out', '--ease-in-out', '--ease-linear']) {
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

  it('easing decelerates on entry and on exit alike, so a dismissal answers at once', () => {
    expect(MOTION).toContain('--ease-out: cubic-bezier(0.22, 1, 0.36, 1)')
    expect(MOTION).toContain('--ease-linear: linear')
    expect(MOTION, 'an accelerating curve came back to stall the first frames').not.toMatch(
      /--ease-in:/,
    )
  })

  it('no surface leaves on an accelerating curve', () => {
    for (const file of ANIMATED_SURFACES) {
      const text = motionOf(file)
      expect(text, `${file} exits on ease-in`).not.toMatch(/\bease-in(?!-out)\b/)
    }
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

  it('no animated surface spells a duration outside the scale', () => {
    const SCALE = ['instant', 'fast', 'fast-exit', 'base', 'base-exit', 'panel', 'zoom', 'slow']
    for (const file of ANIMATED_SURFACES) {
      for (const [found, name] of source(file).matchAll(/\bduration-([a-z0-9.-]+)/g)) {
        expect(SCALE, `${file} spells ${found} outside the duration scale`).toContain(name)
      }
    }
  })

  it('every animated surface picks a duration and an easing from the scale', () => {
    for (const file of ANIMATED_SURFACES) {
      const text = motionOf(file)
      expect(text, `${file} animates without a duration token`).toMatch(
        /motion-safe:duration-(instant|fast|fast-exit|base|base-exit|panel|zoom|slow)/,
      )
      expect(text, `${file} animates without an easing token`).toMatch(
        /motion-safe:ease-(out|in-out|linear)/,
      )
    }
  })
})

describe('the theme switch animation', () => {
  it('runs only when motion is welcome', () => {
    const gate = THEME_TRANSITION.indexOf('@media (prefers-reduced-motion: no-preference)')
    const stop = THEME_TRANSITION.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(gate).toBeGreaterThanOrEqual(0)
    expect(stop).toBeGreaterThan(gate)

    const animated = THEME_TRANSITION.slice(gate, stop)
    expect(animated).toContain('animation-name: theme-fade-out')
    expect(animated).toContain('animation-name: theme-fade-in')
  })

  it('is switched off outright under prefers-reduced-motion', () => {
    const block = THEME_TRANSITION.slice(
      THEME_TRANSITION.indexOf('@media (prefers-reduced-motion: reduce)'),
    )
    for (const pseudo of [
      '::view-transition-group(root)',
      '::view-transition-old(root)',
      '::view-transition-new(root)',
    ]) {
      expect(block).toContain(pseudo)
    }
    expect(block).toContain('animation: none')
  })

  it('cross-fades symmetrically so neither layer hides the other', () => {
    const animated = THEME_TRANSITION.slice(
      THEME_TRANSITION.indexOf('@media (prefers-reduced-motion: no-preference)'),
      THEME_TRANSITION.indexOf('@media (prefers-reduced-motion: reduce)'),
    )
    const durations = [...animated.matchAll(/animation-duration:\s*var\((--duration-[a-z-]+)\)/g)]
    expect(durations.length).toBeGreaterThan(0)
    expect(new Set(durations.map((match) => match[1])).size).toBe(1)

    const easings = [...animated.matchAll(/animation-timing-function:\s*var\((--ease-[a-z-]+)\)/g)]
    expect(easings.length).toBeGreaterThan(0)
    for (const easing of easings) expect(easing[1]).toBe('--ease-in-out')
  })

  it('takes every duration and easing from a token', () => {
    for (const match of THEME_TRANSITION.matchAll(/animation-duration:\s*([^;]+);/g)) {
      expect(match[1]?.trim()).toMatch(/^var\(--duration-[a-z-]+\)$/)
    }
    for (const match of THEME_TRANSITION.matchAll(/animation-timing-function:\s*([^;]+);/g)) {
      expect(match[1]?.trim()).toMatch(/^var\(--ease-[a-z-]+\)$/)
    }
  })
})
