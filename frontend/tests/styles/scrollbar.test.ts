import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const STYLES = join(process.cwd(), 'src', 'styles')

const reset = readFileSync(join(STYLES, 'reset.css'), 'utf8')
const semantic = readFileSync(join(STYLES, 'tokens', 'semantic.css'), 'utf8')
const dark = readFileSync(join(STYLES, 'tokens', 'dark.css'), 'utf8')

describe('scrollbars follow the design system', () => {
  it('replaces the platform scrollbar in both engines', () => {
    expect(reset).toMatch(/::-webkit-scrollbar\s*\{/)
    expect(reset).toMatch(/scrollbar-width:\s*thin/)
    expect(reset).toMatch(/scrollbar-color:/)
  })

  it('paints the thumb from a token, never from a raw colour', () => {
    const thumb = reset.match(/::-webkit-scrollbar-thumb\s*\{[^}]*\}/)?.[0] ?? ''
    expect(thumb).toContain('var(--scrollbar-thumb)')
    expect(thumb).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(thumb).not.toMatch(/\b(rgb|hsl|oklch)\(/)
  })

  it('leaves the track transparent so the surface below shows through', () => {
    const track = reset.match(/::-webkit-scrollbar-track\s*\{[^}]*\}/)?.[0] ?? ''
    expect(track).toContain('transparent')
  })

  it('answers to hover with a second token', () => {
    expect(reset).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*var\(--scrollbar-thumb-hover\)/)
  })

  it('defines both tokens in each theme', () => {
    for (const [name, sheet] of [
      ['light', semantic],
      ['dark', dark],
    ] as const) {
      expect(sheet, `${name} theme misses --scrollbar-thumb`).toMatch(/--scrollbar-thumb:/)
      expect(sheet, `${name} theme misses --scrollbar-thumb-hover`).toMatch(
        /--scrollbar-thumb-hover:/,
      )
    }
  })

  it('keeps the themes distinct, so the thumb never sinks into its surface', () => {
    const read = (sheet: string, token: string) =>
      sheet.split(token + ':')[1]?.split(';')[0]?.trim()
    expect(read(semantic, '--scrollbar-thumb')).not.toBe(read(dark, '--scrollbar-thumb'))
  })
})
