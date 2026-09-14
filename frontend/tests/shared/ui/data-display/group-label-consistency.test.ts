import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const LABEL = join(SRC, 'shared/ui/data-display/group-label/group-label.tsx')

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
const files = sourceFiles(SRC).filter((file) => file !== LABEL)

const ADOPTED = [
  'app/sidebar/nav-section.tsx',
  'features/personal-layer/shell/personal-summary.tsx',
  'features/shortcut-help/shortcut-help.tsx',
  'features/audit-log/audit-log.tsx',
  'features/teams/team-links/team-links-card.tsx',
]

function eyebrows(source: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(/className="([^"]*\buppercase\b[^"]*)"/g)) {
    const classes = match[1] ?? ''
    if (classes.includes('text-caption') && classes.includes('text-muted-foreground'))
      found.push(classes)
  }
  return found
}

describe('a small label naming the group of items below it is written one way', () => {
  it('keeps that spelling in the shared primitive', () => {
    const source = readFileSync(LABEL, 'utf8')
    expect(source).toContain('font-medium')
    expect(source).toContain('text-caption')
    expect(source).toContain('text-muted-foreground')
    expect(source).toContain('uppercase')
    expect(source).toContain('tracking-wide')
  })

  it('lets no screen spell that eyebrow out for itself', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (eyebrows(readFileSync(file, 'utf8')).length > 0) offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('has every adopted screen take the label from the shared primitive', () => {
    for (const relPath of ADOPTED) {
      const source = readFileSync(join(SRC, relPath), 'utf8')
      expect(source, relPath).toContain("from '@/shared/ui/data-display/group-label/group-label'")
      expect(source, relPath).toMatch(/<GroupLabel[\s>]/)
    }
  })

  it('carries the icon inside the label so the row cannot drift apart per screen', () => {
    const source = readFileSync(LABEL, 'utf8')
    expect(source).toContain('icon')
    expect(source).toContain('flex items-center gap-1.5')
    const summary = readFileSync(
      join(SRC, 'features/personal-layer/shell/personal-summary.tsx'),
      'utf8',
    )
    expect(summary).toMatch(/<GroupLabel icon=\{/)
    expect(summary).not.toContain('flex items-center gap-1.5 font-medium')
  })
})
