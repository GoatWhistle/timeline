import { describe, expect, it } from 'vitest'
import { contrastRatio, type Srgb } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

function luminance([r, g, b]: Srgb): number {
  const channel = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const THEMES = ['light', 'dark'] as const

const LADDER = ['--surface-0', '--surface-1', '--surface-2', '--surface-3'] as const

const STEP_FLOOR = 1.05

const EVENNESS = 2

describe.each(THEMES)('the surface ladder separates every rung, %s theme', (theme) => {
  const tokens = loadTheme(theme)
  const fill = (name: string) => resolve(tokens, name)
  const steps = LADDER.slice(1).map((name, index) =>
    contrastRatio(fill(LADDER[index] as string), fill(name)),
  )

  it.each(LADDER.slice(1).map((name, index) => [LADDER[index] as string, name] as const))(
    '%s and %s are told apart without a border',
    (below, above) => {
      expect(contrastRatio(fill(below), fill(above))).toBeGreaterThanOrEqual(STEP_FLOOR)
    },
  )

  it('spends its range evenly rather than hoarding it in one step', () => {
    expect(Math.max(...steps) - 1).toBeLessThanOrEqual((Math.min(...steps) - 1) * EVENNESS)
  })

  it('climbs in one direction only', () => {
    const level = (name: string) => luminance(fill(name))
    const direction = Math.sign(level(LADDER[1]) - level(LADDER[0]))
    expect(direction).not.toBe(0)
    for (const [index, name] of LADDER.slice(1).entries()) {
      expect(Math.sign(level(name) - level(LADDER[index] as string))).toBe(direction)
    }
  })
})

describe('a card is legible as a surface, not only as a rectangle of border', () => {
  it.each(THEMES)('%s theme sets the card apart from the page behind it', (theme) => {
    const tokens = loadTheme(theme)
    expect(
      contrastRatio(resolve(tokens, '--card'), resolve(tokens, '--background')),
    ).toBeGreaterThanOrEqual(STEP_FLOOR)
  })
})

describe('the shade a shadow is mixed from is darker than what it falls on', () => {
  it.each(THEMES)('%s theme can actually cast', (theme) => {
    const tokens = loadTheme(theme)
    expect(
      contrastRatio(resolve(tokens, '--shade'), resolve(tokens, '--background')),
    ).toBeGreaterThan(1)
  })
})
