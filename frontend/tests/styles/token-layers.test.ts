import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const TOKENS = join(SRC, 'styles', 'tokens')

const STYLED = /\.(tsx|module\.css)$/

const PALETTE_TIERS = ['--linear-', '--neutral-', '--hue-', '--brand-']

const TAILWIND_HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

const TAILWIND_COLOUR = new RegExp(
  `\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder)-(?:${TAILWIND_HUES.join('|')})-\\d{2,3}\\b`,
)

const LITERAL_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(/

function collect(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...collect(full))
    else if (STYLED.test(entry.name)) found.push(full)
  }
  return found
}

const styledFiles = collect(SRC).filter((file) => !file.startsWith(TOKENS))

function offenders(match: (source: string) => boolean): string[] {
  return styledFiles
    .filter((file) => match(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file).replaceAll('\\', '/'))
}

describe('components read the semantic tier, never the palette under it', () => {
  it.each(PALETTE_TIERS)('no component reaches for a %s token', (tier) => {
    expect(offenders((source) => source.includes(tier))).toEqual([])
  })

  it('the palette tier is where those tokens actually live', () => {
    const palette = readFileSync(join(TOKENS, 'palette.css'), 'utf8')
    for (const tier of PALETTE_TIERS) expect(palette).toContain(tier)
  })
})

const BARE_COLOUR =
  /\b(?:bg|text|border|ring|fill|stroke|outline|shadow|divide|placeholder)-(?:black|white)\b/

describe('colour is never spelled outside the token system', () => {
  it('no component uses a built-in Tailwind colour scale', () => {
    expect(offenders((source) => TAILWIND_COLOUR.test(source))).toEqual([])
  })

  it('no component writes a raw colour literal', () => {
    expect(offenders((source) => LITERAL_COLOUR.test(source))).toEqual([])
  })

  it('no component paints with bare black or white instead of a token', () => {
    expect(offenders((source) => BARE_COLOUR.test(source))).toEqual([])
  })
})

describe('every overlay wears the one shared chrome', () => {
  const CHROME = join(SRC, 'shared', 'ui', 'overlays', 'overlay-chrome.ts')
  const chrome = readFileSync(CHROME, 'utf8')

  const SCRIM_EXEMPT = ['features/profile/image-editor/image-editor-overlay.tsx']

  const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

  it('the scrim is declared once, as a token', () => {
    expect(chrome).toContain('bg-scrim')
  })

  it('the scrim token exists in both themes', () => {
    for (const file of ['semantic.css', 'dark.css']) {
      expect(readFileSync(join(TOKENS, file), 'utf8')).toMatch(/--scrim:/)
    }
  })

  it('nothing outside that module spells its own full-screen backdrop fill', () => {
    const spelled = styledFiles
      .filter((file) => readFileSync(file, 'utf8').includes('bg-scrim'))
      .map(named)
    expect(spelled).toEqual(SCRIM_EXEMPT)
  })

  it('the chrome declares the raised and the floating surface', () => {
    expect(chrome).toContain('bg-background shadow-floating')
    expect(chrome).toContain('bg-popover')
  })

  it('no component respells a raised or floating panel surface by hand', () => {
    const RAISED = /rounded-surface[^'\n]*bg-background[^'\n]*shadow-floating/
    const FLOATING = /rounded-(?:surface|control)[^'\n]*bg-popover[^'\n]*shadow-lifted/
    const offenders = styledFiles
      .filter((file) => {
        const text = readFileSync(file, 'utf8')
        return RAISED.test(text) || FLOATING.test(text)
      })
      .map(named)
    expect(offenders).toEqual([])
  })

  it('every dropdown panel borrows the floating surface rather than picking its own fill', () => {
    const DROPDOWN = /DropdownMenu\.Content|PopoverPrimitive\.Content/
    const users = styledFiles.filter((file) => DROPDOWN.test(readFileSync(file, 'utf8')))
    expect(users.length).toBeGreaterThan(0)
    for (const file of users) {
      expect(readFileSync(file, 'utf8'), `${named(file)} styles a dropdown by hand`).toContain(
        'FLOATING_SURFACE',
      )
    }
  })
})

describe('every token a theme overrides is declared by the base theme', () => {
  const declared = (file: string) => {
    const source = readFileSync(join(TOKENS, file), 'utf8')
    return new Set([...source.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(([, name]) => name))
  }

  it('the dark theme introduces no token the light theme lacks', () => {
    const base = new Set([
      ...declared('palette.css'),
      ...declared('semantic.css'),
      ...declared('domain.css'),
      ...declared('typography.css'),
      ...declared('motion.css'),
    ])
    const missing = [...declared('dark.css')].filter((name) => !base.has(name))
    expect(missing).toEqual([])
  })
})

const TOKEN_FILES = ['palette.css', 'semantic.css', 'domain.css', 'typography.css', 'dark.css']

describe('the palette carries no colour nothing asks for', () => {
  const tokenSource = TOKEN_FILES.map((file) => readFileSync(join(TOKENS, file), 'utf8')).join('\n')
  const componentSource = styledFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
  const indexSource = readFileSync(join(SRC, 'styles', 'index.css'), 'utf8')
  const everywhere = `${tokenSource}\n${componentSource}\n${indexSource}`

  const palette = [
    ...readFileSync(join(TOKENS, 'palette.css'), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g),
  ].map(([, name]) => name as string)

  it('the palette is not empty', () => {
    expect(palette.length).toBeGreaterThan(0)
  })

  it.each(palette)('%s is referenced by something above it', (token) => {
    expect(everywhere).toContain(`var(${token})`)
  })
})
