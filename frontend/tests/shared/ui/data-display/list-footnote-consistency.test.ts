import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const FOOTNOTE = join(SRC, 'shared/ui/data-display/list-footnote/list-footnote.tsx')

const CLOSED_LISTS = ['features/teams/teams.tsx', 'features/personal-history/history.tsx']

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
})
