import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const BAR = join(SRC, 'shared/ui/data-display/summary-bar/summary-bar.tsx')

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
const files = sourceFiles(SRC).filter((file) => file !== BAR)

const SUMMARIES = [
  'features/admin-stats/admin-stats.tsx',
  'features/teams/teams-summary.tsx',
  'features/personal-history/history-summary.tsx',
]

describe('a strip of counted facts above a list is written one way', () => {
  it('keeps the divider between groups as one spelling, not a bare span per page', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (readFileSync(file, 'utf8').includes('mx-1 h-6 w-px bg-border'))
        offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('keeps the metric shell as one spelling, not a padding string copied per page', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (source.includes('flex min-w-20 flex-col gap-0.5 rounded-control'))
        offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('builds every summary strip from the shared bar rather than its own section', () => {
    for (const relPath of SUMMARIES) {
      const source = readFileSync(join(SRC, relPath), 'utf8')
      expect(source, relPath).toContain('SummaryBar')
      expect(source, relPath).not.toMatch(/<section[\s\S]{0,200}border-border border-b/)
    }
  })

  it('names every strip for a screen reader, because it is a landmark and not decoration', () => {
    expect(readFileSync(BAR, 'utf8')).toContain('aria-label={label}')
    for (const relPath of SUMMARIES) {
      expect(readFileSync(join(SRC, relPath), 'utf8'), relPath).toMatch(/SummaryBar label=\{/)
    }
  })
})
