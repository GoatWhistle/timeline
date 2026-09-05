import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const CARD = join(SRC, 'shared/ui/layout/card.tsx')

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('the card pads itself rather than making every caller undo it', () => {
  const card = readFileSync(CARD, 'utf8')

  it('gives content the same padding on every side by default', () => {
    expect(card).toContain("'p-6")
  })

  it('drops the top padding only where a header already supplied it', () => {
    expect(card).toContain('[[data-slot=card-header]+&]:pt-0')
  })

  it('never hardcodes the headerless case as a stripped top', () => {
    expect(card).not.toMatch(/'p-6 pt-0'/)
  })

  it('no caller has to paste the top padding back on', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => file !== CARD)
      .filter((file) => /<CardContent className="[^"]*\bpt-6\b/.test(readFileSync(file, 'utf8')))
      .map(named)
    expect(offenders).toEqual([])
  })
})

describe('the card names its own parts so structure can be styled from structure', () => {
  const card = readFileSync(CARD, 'utf8')

  it.each(['card', 'card-header', 'card-title', 'card-description', 'card-content'])(
    'marks the %s slot',
    (slot) => {
      expect(card).toContain(`data-slot="${slot}"`)
    },
  )
})

describe('a subtitle under a card title is the card description, not a loose paragraph', () => {
  it('no feature hand-rolls the description the card already offers', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => file !== CARD)
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return /<\/CardTitle>\s*\n\s*<p className="text-meta text-muted-foreground"/.test(source)
      })
      .map(named)
    expect(offenders).toEqual([])
  })
})
