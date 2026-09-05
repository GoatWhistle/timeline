import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const ACTIONS = join(SRC, 'shared/ui/primitives/row-actions.tsx')

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
const files = sourceFiles(SRC).filter((file) => file !== ACTIONS)

const SETTINGS = ['features/profile/profile-links-card/profile-link-row.tsx']

function elements(source: string): string[] {
  const found: string[] = []
  const opens = [...source.matchAll(/<(?:Button|button)\b/g)]
  for (const open of opens) {
    const start = open.index ?? 0
    const end = source.indexOf('</', start)
    found.push(source.slice(start, end === -1 ? source.length : end))
  }
  return found
}

const MOVE_LABEL = /\b(moveUp|moveDown|moveUpAria|moveDownAria)\b/

describe('a row that can be moved up or down is written one way', () => {
  it('keeps that spelling in the shared primitive, beside edit and delete', () => {
    const source = readFileSync(ACTIONS, 'utf8')
    for (const name of ['MoveUpAction', 'MoveDownAction', 'EditAction', 'DeleteAction']) {
      expect(source, name).toMatch(new RegExp(`export function ${name}\\b`))
    }
    expect(source).toContain('data-row-action="move-up"')
    expect(source).toContain('data-row-action="move-down"')
  })

  it('draws the move with an arrow, never the chevron that means paging', () => {
    const source = readFileSync(ACTIONS, 'utf8')
    expect(source).toContain('<ArrowUp')
    expect(source).toContain('<ArrowDown')
    expect(source).not.toContain('Chevron')
  })

  it('sizes the move exactly as it sizes the edit and the delete beside it', () => {
    const source = readFileSync(ACTIONS, 'utf8')
    const sized = [...source.matchAll(/cn\(\s*'([^']*)'/g)].map((match) => match[1] ?? '')
    expect(sized.length).toBe(4)
    for (const classes of sized) expect(classes).toContain('size-8 shrink-0')
  })

  it('lets no screen build a move button out of a raw Button for itself', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (elements(source).some((node) => MOVE_LABEL.test(node))) offenders.push(named(file))
    }
    expect(offenders.sort()).toEqual([...SETTINGS].sort())
  })

  it('has every screen that moves a row take the button from the shared primitive', () => {
    const adopted: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!MOVE_LABEL.test(source)) continue
      if (SETTINGS.includes(named(file))) continue
      adopted.push(named(file))
      expect(source, named(file)).toContain("from '@/shared/ui/primitives/row-actions'")
      expect(source, named(file)).toMatch(/<MoveUpAction[\s/]/)
      expect(source, named(file)).toMatch(/<MoveDownAction[\s/]/)
    }
    expect(adopted.length).toBeGreaterThan(2)
  })
})
