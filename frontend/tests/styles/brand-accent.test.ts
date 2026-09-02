import { describe, expect, it } from 'vitest'
import { contrastRatio, type Srgb } from '@/styles/oklch'
import { hueOf, loadTheme, resolve, resolveRaw } from '@/styles/read-tokens'

const THEMES = ['light', 'dark'] as const

const TEXT_AA = 4.5
const UI_AA = 3

const SURFACES = ['background', 'card', 'surface-1', 'surface-2', 'surface-3', 'popover']

const BRAND_TOKENS = ['logo', 'accent', 'ring']

const HUE_TOLERANCE = 12

function blend(fill: Srgb, ground: Srgb, alpha: number): Srgb {
  return [
    fill[0] * alpha + ground[0] * (1 - alpha),
    fill[1] * alpha + ground[1] * (1 - alpha),
    fill[2] * alpha + ground[2] * (1 - alpha),
  ]
}

function hueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360
  return raw > 180 ? 360 - raw : raw
}

describe.each(THEMES)('the accent belongs to the brand, %s theme', (theme) => {
  const tokens = loadTheme(theme)

  it.each(BRAND_TOKENS)('%s carries the brand hue in this theme too', (token) => {
    expect(hueDistance(hueOf(tokens, `--${token}`), hueOf(tokens, '--logo'))).toBeLessThanOrEqual(
      HUE_TOLERANCE,
    )
  })

  it('the focus ring is the accent, not a second chromatic family', () => {
    expect(resolveRaw(tokens, '--ring')).toEqual(resolveRaw(tokens, '--accent'))
  })
})

describe('both themes speak the same brand hue', () => {
  it.each(BRAND_TOKENS)('%s does not switch hue family between themes', (token) => {
    const light = hueOf(loadTheme('light'), `--${token}`)
    const dark = hueOf(loadTheme('dark'), `--${token}`)
    expect(hueDistance(light, dark)).toBeLessThanOrEqual(HUE_TOLERANCE)
  })
})

describe.each(THEMES)('the accent is legible where it is spelled, %s theme', (theme) => {
  const tokens = loadTheme(theme)

  it.each(SURFACES)('accent as text on %s meets 4.5:1', (surface) => {
    expect(
      contrastRatio(resolve(tokens, '--accent'), resolve(tokens, `--${surface}`)),
    ).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(SURFACES)('logo as a mark on %s meets 3:1', (surface) => {
    expect(
      contrastRatio(resolve(tokens, '--logo'), resolve(tokens, `--${surface}`)),
    ).toBeGreaterThanOrEqual(UI_AA)
  })
})

const TRACK_ALPHA = { light: 0.75, dark: 0.55 } as const

describe.each(THEMES)('the logo mark survives its own background, %s theme', (theme) => {
  const tokens = loadTheme(theme)

  it.each(SURFACES)('the faded track still separates from %s at 3:1', (surface) => {
    const ground = resolve(tokens, `--${surface}`)
    const track = blend(resolve(tokens, '--logo'), ground, TRACK_ALPHA[theme])
    expect(contrastRatio(track, ground)).toBeGreaterThanOrEqual(UI_AA)
  })

  it('the track opacity the stylesheet declares is the one measured here', () => {
    expect(Number(resolveRaw(tokens, '--logo-track-opacity'))).toBeCloseTo(TRACK_ALPHA[theme], 5)
  })
})
