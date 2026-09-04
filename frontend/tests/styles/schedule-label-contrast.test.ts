import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, type Srgb } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const TEXT_AA = 4.5

const THEMES = ['light', 'dark'] as const

const SCHEDULE = join(process.cwd(), 'src', 'features', 'schedule', 'ui')

const LABEL_SHEETS = [
  join(SCHEDULE, 'wrapped-grid', 'wrapped-grid.module.css'),
  join(SCHEDULE, 'phone-month', 'phone-month.module.css'),
  join(SCHEDULE, 'week-grid', 'week-grid.module.css'),
]

const LABEL_RULE = /\.(weekday|dayName)\b[^{]*\{([^}]*)\}/g

const FADE =
  /color-mix\(\s*in\s+oklch\s*,\s*var\(--muted-foreground\)\s*(\d+)%\s*,\s*transparent\s*\)/

function over(colour: Srgb, background: Srgb, alpha: number): Srgb {
  return colour.map(
    (channel, index) => channel * alpha + (background[index] ?? 0) * (1 - alpha),
  ) as Srgb
}

function labelColours(file: string): { selector: string; value: string }[] {
  const source = readFileSync(file, 'utf8')
  const found: { selector: string; value: string }[] = []
  for (const match of source.matchAll(LABEL_RULE)) {
    const body = match[2] ?? ''
    const colour = body.match(/(?:^|[;{\s])color\s*:\s*([^;]+);/)?.[1]
    if (colour)
      found.push({
        selector: match[0].slice(0, match[0].indexOf('{')).trim(),
        value: colour.trim(),
      })
  }
  return found
}

describe.each(THEMES)('weekday labels stay readable, %s theme', (theme) => {
  const tokens = loadTheme(theme)
  const background = resolve(tokens, '--background')

  it.each(LABEL_SHEETS)('%s declares at least one day label colour', (file) => {
    expect(labelColours(file).length).toBeGreaterThan(0)
  })

  it.each(LABEL_SHEETS)('every day label in %s clears 4.5:1 on the grid', (file) => {
    for (const { selector, value } of labelColours(file)) {
      const faded = value.match(FADE)
      const ratio = faded
        ? contrastRatio(
            over(resolve(tokens, '--muted-foreground'), background, Number(faded[1]) / 100),
            background,
          )
        : contrastRatio(resolve(tokens, value.replace(/^var\(|\)$/g, '')), background)
      expect(ratio, `${selector} in ${file} reads at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        TEXT_AA,
      )
    }
  })

  it.each(LABEL_SHEETS)('%s never fades a day label into unreadability', (file) => {
    for (const { selector, value } of labelColours(file)) {
      const faded = value.match(FADE)
      if (!faded) continue
      const ratio = contrastRatio(
        over(resolve(tokens, '--muted-foreground'), background, Number(faded[1]) / 100),
        background,
      )
      expect(ratio, `${selector} in ${file}`).toBeGreaterThanOrEqual(TEXT_AA)
    }
  })
})
