import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SERVICE_GLYPHS } from '@/shared/ui/navigation/service-link/service-glyphs'

const SRC = join(process.cwd(), 'src')

const CANONICAL = 'shared/ui/navigation/service-link/service-icon.tsx'

const IMPORTS_MARK = /import\s*\{[^}]*\bTelegramMark\b[^}]*\}\s*from\s*'([^']+)'/g

const DRAWS_INLINE_SVG = /<svg\b[^>]*>[\s\S]*?<\/svg>/g

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('the Telegram brand mark is spelled in exactly one place', () => {
  it('keeps the Telegram path data equal to the one vetted glyph the icon system holds', () => {
    expect(SERVICE_GLYPHS.telegram.viewBox).toBe('0 0 24 24')
    expect(SERVICE_GLYPHS.telegram.path).toBe(
      'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    )
  })

  it('imports TelegramMark from the canonical service-icon module everywhere it is used', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC)) {
      const relPath = named(file)
      if (relPath === CANONICAL) continue
      const source = readFileSync(file, 'utf8')

      for (const match of source.matchAll(IMPORTS_MARK)) {
        const from = match[1] ?? ''
        const resolvesToCanonical =
          from === '@/shared/ui/navigation/service-link/service-icon' ||
          from.endsWith('/service-link/service-icon')
        if (!resolvesToCanonical) offenders.push(`${relPath}: TelegramMark imported from ${from}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('lets no other file hand-draw an svg containing the Telegram path data', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC)) {
      const relPath = named(file)
      if (relPath === CANONICAL) continue
      const source = readFileSync(file, 'utf8')

      for (const svg of source.matchAll(DRAWS_INLINE_SVG)) {
        if (svg[0].includes('M11.944 0A12 12 0 0 0 0 12')) offenders.push(relPath)
      }
    }

    expect(offenders).toEqual([])
  })
})
