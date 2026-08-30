import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const THEMES = ['light', 'dark'] as const

const REST = '--background'
const HOVER = '--surface-2'
const SELECTED = '--accent-surface'

const FILL_STEP = 1.08
const HAIRLINE = 1.15

const SRC = join(process.cwd(), 'src')

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

describe.each(THEMES)('row fill ladder, %s theme', (theme) => {
  const tokens = loadTheme(theme)
  const luminance = (name: string) => relativeLuminance(resolve(tokens, name))
  const ratio = (a: string, b: string) => contrastRatio(resolve(tokens, a), resolve(tokens, b))

  it('hover and selection are three distinct fills', () => {
    expect(resolve(tokens, REST)).not.toEqual(resolve(tokens, HOVER))
    expect(resolve(tokens, HOVER)).not.toEqual(resolve(tokens, SELECTED))
    expect(resolve(tokens, REST)).not.toEqual(resolve(tokens, SELECTED))
  })

  it('selection reads as a stronger step than hover, never a weaker one', () => {
    const rest = luminance(REST)
    const hover = luminance(HOVER)
    const selected = luminance(SELECTED)
    const direction = Math.sign(hover - rest)
    expect(direction).not.toBe(0)
    expect(Math.sign(selected - hover)).toBe(direction)
  })

  it('hover is perceptible against the resting row', () => {
    expect(ratio(REST, HOVER)).toBeGreaterThanOrEqual(FILL_STEP)
  })

  it('selection is perceptible against hover', () => {
    expect(ratio(HOVER, SELECTED)).toBeGreaterThanOrEqual(FILL_STEP)
  })
})

const BORDER_BACKDROPS = [
  '--background',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--card',
  '--popover',
  '--accent-surface',
  '--muted',
  '--secondary',
]

describe.each(THEMES)('hairline borders stay visible, %s theme', (theme) => {
  const tokens = loadTheme(theme)

  it.each(BORDER_BACKDROPS)('border is perceptible on %s', (backdrop) => {
    expect(contrastRatio(resolve(tokens, '--border'), resolve(tokens, backdrop))).toBeGreaterThan(
      HAIRLINE,
    )
  })

  it('border is never the same colour as the surface it divides', () => {
    for (const backdrop of BORDER_BACKDROPS) {
      expect(resolve(tokens, '--border')).not.toEqual(resolve(tokens, backdrop))
    }
  })
})

const TSX = /\.tsx$/

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (TSX.test(entry.name)) found.push(full)
  }
  return found
}

describe('the hover fill is spelled the same way everywhere', () => {
  const files = sourceFiles(SRC)

  it('no component reaches past the hover step to the selection fill', () => {
    const offenders = files.filter((file) =>
      readFileSync(file, 'utf8').includes('hover:bg-surface-3'),
    )
    expect(offenders).toEqual([])
  })

  it('at least one surface actually uses the hover step', () => {
    const users = files.filter((file) => readFileSync(file, 'utf8').includes('hover:bg-surface-2'))
    expect(users.length).toBeGreaterThan(0)
  })
})
