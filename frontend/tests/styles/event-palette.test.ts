import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_COLOR_FAMILIES, EVENT_COLOR_SLOTS } from '@/entities/event/event-color'
import { contrastRatio, type Srgb } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const TEXT_AA = 4.5
const UI_AA = 3
const SEPARATION = 10

const THEMES = ['light', 'dark'] as const

const SURFACES = ['background', 'surface-1', 'surface-2', 'surface-3']

const INK: Record<(typeof THEMES)[number], string> = {
  light: '--foreground',
  dark: '--foreground',
}

const FILL_ALPHA = 0.18

const FILL_ALPHA_STRONG = 0.3

const COVER_INK = '--foreground'

const PALETTE = join(process.cwd(), 'src', 'styles', 'tokens', 'event-palette.css')

function slotToken(family: string, slot: number): string {
  return `--event-${family.toLowerCase()}-${slot}`
}

function everySlot(): { family: string; slot: number; token: string }[] {
  return EVENT_COLOR_FAMILIES.flatMap((family) =>
    Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) => ({
      family,
      slot,
      token: slotToken(family, slot),
    })),
  )
}

function over(colour: Srgb, background: Srgb, alpha: number): Srgb {
  return colour.map(
    (channel, index) => channel * alpha + (background[index] ?? 0) * (1 - alpha),
  ) as Srgb
}

function channelDistance(a: Srgb, b: Srgb): number {
  return Math.hypot(...a.map((channel, index) => (channel - (b[index] ?? 0)) * 255))
}

function paletteTokens(theme: 'light' | 'dark'): Map<string, string> {
  const source = readFileSync(PALETTE, 'utf8')
  const selector = theme === 'light' ? ':root {' : '.dark {'
  const start = source.indexOf(selector)
  const block = source.slice(start, source.indexOf('\n}', start))
  const found = new Map(loadTheme(theme))
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match
    if (name && value) found.set(name, value.trim())
  }
  return found
}

describe.each(THEMES)('event palette contrast, %s theme', (theme) => {
  const tokens = paletteTokens(theme)
  const slots = everySlot()

  it.each(slots)('$family slot $slot is a declared token', ({ token }) => {
    expect(() => resolve(tokens, token)).not.toThrow()
  })

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'outline %s on %s separates at 3:1',
    (token, bg) => {
      expect(
        contrastRatio(resolve(tokens, token), resolve(tokens, `--${bg}`)),
      ).toBeGreaterThanOrEqual(UI_AA)
    },
  )

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'the colour of %s reads as text on %s at 4.5:1',
    (token, bg) => {
      expect(
        contrastRatio(resolve(tokens, token), resolve(tokens, `--${bg}`)),
      ).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'body text over the translucent fill of %s on %s meets 4.5:1',
    (token, bg) => {
      const background = resolve(tokens, `--${bg}`)
      const fill = over(resolve(tokens, token), background, FILL_ALPHA)
      expect(contrastRatio(resolve(tokens, INK[theme]), fill)).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )

  it('no two slots of a family collapse into the same colour', () => {
    for (const family of EVENT_COLOR_FAMILIES) {
      const colours = Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) =>
        resolve(tokens, slotToken(family, slot)),
      )
      for (const [i, left] of colours.entries()) {
        for (const right of colours.slice(i + 1)) {
          expect(channelDistance(left, right)).toBeGreaterThanOrEqual(SEPARATION)
        }
      }
    }
  })

  it('the two families stay apart from each other', () => {
    const ru = Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) =>
      resolve(tokens, slotToken('RU', slot)),
    )
    const world = Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) =>
      resolve(tokens, slotToken('WORLD', slot)),
    )
    for (const a of ru) {
      for (const b of world) expect(channelDistance(a, b)).toBeGreaterThanOrEqual(SEPARATION * 2)
    }
  })

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'the cover placeholder reads over the strong fill of %s on %s at 4.5:1',
    (token, bg) => {
      const background = resolve(tokens, `--${bg}`)
      const fill = over(resolve(tokens, token), background, FILL_ALPHA_STRONG)
      expect(contrastRatio(resolve(tokens, COVER_INK), fill)).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'the slot colour of %s would not carry the placeholder over its own fill on %s',
    (token, bg) => {
      const background = resolve(tokens, `--${bg}`)
      const fill = over(resolve(tokens, token), background, FILL_ALPHA_STRONG)
      const ink = contrastRatio(resolve(tokens, COVER_INK), fill)
      expect(ink).toBeGreaterThanOrEqual(contrastRatio(resolve(tokens, token), fill))
    },
  )

  it('the unassigned fallback is a real colour and not a palette slot', () => {
    const fallback = resolve(tokens, '--event-unassigned')
    for (const { token } of everySlot()) {
      expect(channelDistance(fallback, resolve(tokens, token))).toBeGreaterThan(0)
    }
  })
})

describe('the palette differs between themes', () => {
  it.each(everySlot())('$family slot $slot is repainted for dark', ({ token }) => {
    expect(resolve(paletteTokens('light'), token)).not.toEqual(
      resolve(paletteTokens('dark'), token),
    )
  })
})
