import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const TOKENS = join(SRC, 'styles', 'tokens')

const NAMED = ['flat', 'raised', 'lifted', 'floating']

const UNGOVERNED = /\bshadow-(2xs|xs|sm|md|lg|xl|2xl|inner|none)\b/

const THEMES = [
  ['light', 'semantic.css'],
  ['dark', 'dark.css'],
] as const

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
      continue
    }
    if (/\.(tsx?|css)$/.test(entry)) found.push(path)
  }
  return found
}

const named = (file: string) => file.slice(SRC.length + 1).replaceAll('\\', '/')

function elevations(file: string): Map<string, string> {
  const source = readFileSync(join(TOKENS, file), 'utf8')
  const found = new Map<string, string>()
  for (const match of source.matchAll(/--elevation-([a-z]+)\s*:\s*([^;]+);/g)) {
    const [, step, value] = match
    if (step && value) found.set(step, value.replaceAll(/\s+/g, ' ').trim())
  }
  return found
}

describe('elevation is spelled once, as a token', () => {
  it('the theme layer publishes exactly the four named steps', () => {
    const theme = readFileSync(join(SRC, 'styles', 'index.css'), 'utf8')
    const declared = [...theme.matchAll(/^\s*--shadow-([a-z0-9-]+):/gm)].map((match) => match[1])
    expect([...new Set(declared)].sort()).toEqual([...NAMED].sort())
  })

  it('each named step maps to the elevation token behind it', () => {
    const theme = readFileSync(join(SRC, 'styles', 'index.css'), 'utf8')
    for (const step of NAMED) {
      expect(theme).toContain(`--shadow-${step}: var(--elevation-${step});`)
    }
  })

  it('no component reaches for a shadow outside the ramp', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.startsWith(TOKENS))
      .filter((file) => UNGOVERNED.test(readFileSync(file, 'utf8')))
      .map(named)
    expect(offenders).toEqual([])
  })

  it('the ramp is actually worn by something', () => {
    const everything = sourceFiles(SRC)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
    for (const step of NAMED) expect(everything).toContain(`shadow-${step}`)
  })
})

describe.each(THEMES)('every theme declares the whole ramp, %s', (_theme, file) => {
  const steps = elevations(file)

  it.each(NAMED)('%s is declared', (step) => {
    expect(steps.get(step)).toBeDefined()
  })

  it('no two steps of the ramp are the same shadow', () => {
    const values = NAMED.map((step) => steps.get(step))
    expect(new Set(values).size).toBe(NAMED.length)
  })

  it('the ramp deepens: each step blurs further than the one below it', () => {
    const blur = (step: string) =>
      Math.max(
        ...[...(steps.get(step) ?? '').matchAll(/-?\d+px/g)].map(([px]) =>
          Math.abs(Number.parseInt(px, 10)),
        ),
      )
    const depths = NAMED.map(blur)
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i], `${NAMED[i]} must sit above ${NAMED[i - 1]}`).toBeGreaterThan(
        depths[i - 1] as number,
      )
    }
  })

  it('every step tints itself from the theme shade, never a raw colour', () => {
    for (const step of NAMED) {
      const value = steps.get(step) ?? ''
      expect(value, `--elevation-${step} spells a colour by hand`).not.toMatch(
        /#[0-9a-fA-F]{3,8}|\brgba?\(|\bhsla?\(|\boklch\(/,
      )
      expect(value).toContain('var(--shade)')
    }
  })
})

describe('the card wears the ramp rather than a shadow of its own', () => {
  const card = readFileSync(join(SRC, 'shared', 'ui', 'layout', 'card.tsx'), 'utf8')

  it('the card is raised', () => {
    expect(card).toContain('shadow-raised')
  })

  it('the card draws its own hairline rather than inheriting an unnamed one', () => {
    expect(card).toContain('border border-border')
  })
})
