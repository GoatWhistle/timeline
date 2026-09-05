import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const FOOTNOTE = join(SRC, 'shared/ui/data-display/list-footnote/list-footnote.tsx')

const CLOSED_LISTS = [
  'features/teams/teams.tsx',
  'features/personal-history/history.tsx',
  'features/teams/team-overview.tsx',
  'features/teams/team-events.tsx',
]

const FOOTNOTE_KEY = /(^|\.)(footnote|selfReportHint)$/i

const TRANSLATED = /\bt\(\s*['"`]([^'"`]+)['"`]/g

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('a list page closes with one spelling of its closing note', () => {
  it('ends every long list page with the shared footnote, not a bare paragraph', () => {
    for (const relPath of CLOSED_LISTS) {
      const source = readFileSync(join(SRC, relPath), 'utf8')
      expect(source, relPath).toContain('ListFootnote')
      expect(source, relPath).toMatch(/<ListFootnote text=\{/)
    }
  })

  it('states the note style once, so a page cannot spell its own quiet text', () => {
    const source = readFileSync(FOOTNOTE, 'utf8')
    expect(source).toContain("FOOTNOTE_TEXT = 'text-meta text-muted-foreground'")
    expect(source).toContain('max-w-prose')
  })

  it('reads the note from the dictionary rather than a literal in the screen', () => {
    for (const relPath of CLOSED_LISTS) {
      const source = readFileSync(join(SRC, relPath), 'utf8')
      expect(source, relPath).toMatch(/<ListFootnote text=\{t\(/)
    }
  })

  it('renders every footnote key through the shared note, never a hand-rolled paragraph', () => {
    const offenders: string[] = []
    for (const file of tsxFiles(SRC)) {
      if (file === FOOTNOTE) continue
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(TRANSLATED)) {
        const key = match[1] ?? ''
        if (!FOOTNOTE_KEY.test(key)) continue
        const wrapped = new RegExp(
          `<ListFootnote[^>]*text=\\{\\s*t\\(\\s*['"\`]${key.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}['"\`]`,
        )
        if (!wrapped.test(source)) offenders.push(`${named(file)}: ${key}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('the rule still has footnote keys to guard, so it cannot pass by matching nothing', () => {
    const guarded = new Set<string>()
    for (const file of tsxFiles(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(TRANSLATED)) {
        const key = match[1] ?? ''
        if (FOOTNOTE_KEY.test(key)) guarded.add(key)
      }
    }
    expect([...guarded].sort()).toEqual(['footnote', 'personal.history.footnote', 'selfReportHint'])
  })
})
