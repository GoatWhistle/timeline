import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_COLOR_FAMILIES, EVENT_COLOR_SLOTS } from '@/entities/event/event-color/event-color'
import { contrastRatio, type Srgb } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const TEXT_AA = 4.5

const THEMES = ['light', 'dark'] as const

const SURFACES = ['background', 'surface-2', 'surface-3', 'card']

const PALETTE = join(process.cwd(), 'src', 'styles', 'tokens', 'event-palette.css')

const MIN_FILL_SATURATION: Record<(typeof THEMES)[number], number> = {
  light: 18,
  dark: 8,
}

const MIN_FILL_SEPARATION: Record<(typeof THEMES)[number], number> = {
  light: 3,
  dark: 2.9,
}

function paletteTokens(theme: (typeof THEMES)[number]): Map<string, string> {
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

function alphaOf(tokens: Map<string, string>, name: string): number {
  const raw = tokens.get(name)
  if (!raw) throw new Error(`${name} is not declared`)
  const percent = raw.match(/^([\d.]+)%$/)?.[1]
  if (!percent) throw new Error(`${name} is not a percentage: ${raw}`)
  return Number(percent) / 100
}

function over(colour: Srgb, background: Srgb, alpha: number): Srgb {
  return colour.map(
    (channel, index) => channel * alpha + (background[index] ?? 0) * (1 - alpha),
  ) as Srgb
}

function saturation(colour: Srgb): number {
  return (Math.max(...colour) - Math.min(...colour)) * 255
}

function separation(a: Srgb, b: Srgb): number {
  return Math.hypot(...a.map((channel, index) => (channel - (b[index] ?? 0)) * 255))
}

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

describe.each(THEMES)('the schedule bar keeps its colour, %s theme', (theme) => {
  const tokens = paletteTokens(theme)
  const alpha = alphaOf(tokens, '--event-fill-alpha')
  const slots = everySlot()

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'the fill of %s on %s stays a colour rather than a grey',
    (token, bg) => {
      const fill = over(resolve(tokens, token), resolve(tokens, `--${bg}`), alpha)
      expect(saturation(fill)).toBeGreaterThanOrEqual(MIN_FILL_SATURATION[theme])
    },
  )

  it.each(SURFACES)('no two bars drawn on %s collapse into the same fill', (bg) => {
    const background = resolve(tokens, `--${bg}`)
    for (const family of EVENT_COLOR_FAMILIES) {
      const fills = Array.from({ length: EVENT_COLOR_SLOTS }, (_, slot) =>
        over(resolve(tokens, slotToken(family, slot)), background, alpha),
      )
      for (const [index, left] of fills.entries()) {
        for (const [offset, right] of fills.slice(index + 1).entries()) {
          expect(
            separation(left, right),
            `${family} ${index} and ${index + offset + 1} on ${bg}`,
          ).toBeGreaterThanOrEqual(MIN_FILL_SEPARATION[theme])
        }
      }
    }
  })

  it.each(slots.flatMap((s) => SURFACES.map((bg) => [s.token, bg] as const)))(
    'the bar label still reads over the fill of %s on %s',
    (token, bg) => {
      const fill = over(resolve(tokens, token), resolve(tokens, `--${bg}`), alpha)
      expect(contrastRatio(resolve(tokens, '--foreground'), fill)).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )
})

describe('the light theme is not left duller than the dark one', () => {
  const median = (values: number[]): number =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

  const fillsOf = (theme: (typeof THEMES)[number]): number[] => {
    const tokens = paletteTokens(theme)
    const alpha = alphaOf(tokens, '--event-fill-alpha')
    const card = resolve(tokens, '--card')
    return everySlot().map(({ token }) => saturation(over(resolve(tokens, token), card, alpha)))
  }

  it('carries at least as much colour on paper as it does on black', () => {
    expect(median(fillsOf('light'))).toBeGreaterThanOrEqual(median(fillsOf('dark')))
  })
})
