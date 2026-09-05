import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const SHARED = join(SRC, 'shared/ui/data-display/fact-list.tsx')

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
const files = sourceFiles(SRC)

const DIVIDED_ROW = 'first:pt-0 last:border-b-0 last:pb-0'

describe('a labelled fact row is written once and reused, not copied per feature', () => {
  it('keeps the divided row in the shared primitive', () => {
    expect(readFileSync(SHARED, 'utf8')).toContain(DIVIDED_ROW)
  })

  it('lets no feature re-declare that same divided row for itself', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (file === SHARED) continue
      if (readFileSync(file, 'utf8').includes(DIVIDED_ROW)) offenders.push(named(file))
    }
    expect(offenders).toEqual(['features/event-card/event-facts.tsx'])
  })

  it('has the registration panel take its rows from the shared primitive', () => {
    const source = readFileSync(join(SRC, 'features/registration/registration-facts.tsx'), 'utf8')
    expect(source).toContain("from '@/shared/ui/data-display/fact-list'")
    expect(source).not.toContain('function Fact(')
  })
})
