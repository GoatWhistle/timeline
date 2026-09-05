import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEASONS } from '@/features/schedule/model/ribbon/ribbon-season'
import { contrastRatio } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const TEXT_AA = 4.5
const NON_TEXT_AA = 3

const THEMES = ['light', 'dark'] as const

const RIBBON_SHEET = join(
  process.cwd(),
  'src',
  'features',
  'schedule',
  'ui',
  'ribbon',
  'ribbon.module.css',
)

describe.each(THEMES)('every season keeps the ribbon readable, %s theme', (theme) => {
  const tokens = loadTheme(theme)

  it.each(SEASONS)('%s declares a background of its own', (season) => {
    expect(() => resolve(tokens, `--season-${season}`)).not.toThrow()
  })

  it.each(SEASONS)('body text clears 4.5:1 on the %s ground', (season) => {
    const ratio = contrastRatio(
      resolve(tokens, '--foreground'),
      resolve(tokens, `--season-${season}`),
    )

    expect(
      ratio,
      `--foreground on --season-${season} reads at ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(SEASONS)('the quiet labels clear 4.5:1 on the %s ground', (season) => {
    const ratio = contrastRatio(
      resolve(tokens, '--muted-foreground'),
      resolve(tokens, `--season-${season}`),
    )

    expect(
      ratio,
      `--muted-foreground on --season-${season} reads at ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(SEASONS)('the borders that draw the bars clear 3:1 on the %s ground', (season) => {
    const ratio = contrastRatio(
      resolve(tokens, '--border-strong'),
      resolve(tokens, `--season-${season}`),
    )

    expect(
      ratio,
      `--border-strong on --season-${season} reads at ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(NON_TEXT_AA)
  })

  it.each(SEASONS)('the today marker clears 3:1 on the %s ground', (season) => {
    const ratio = contrastRatio(
      resolve(tokens, '--urgency-today'),
      resolve(tokens, `--season-${season}`),
    )

    expect(
      ratio,
      `--urgency-today on --season-${season} reads at ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(NON_TEXT_AA)
  })
})

describe('the ribbon paints its seasons from tokens, never from raw colour', () => {
  const sheet = readFileSync(RIBBON_SHEET, 'utf8')

  it('names a token for every season it can draw', () => {
    for (const season of SEASONS) {
      expect(sheet, `season ${season} has no rule`).toContain(`--season-${season}`)
    }
  })

  it('writes no raw hex anywhere in the ribbon', () => {
    expect(sheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('writes no bare oklch of its own, the tokens owning the palette', () => {
    expect(sheet).not.toMatch(/:\s*oklch\(/)
  })
})
