import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const ADMIN_TABLES = [
  'features/user-list/user-list.tsx',
  'features/deadline-list/deadline-list.tsx',
  'features/invite-list/invite-list.tsx',
  'features/audit-log/audit-log.tsx',
]

function tableHeadClasses(source: string): string[] {
  return [...source.matchAll(/<TableHead\b([^>]*)>/g)].map((match) => {
    const attrs = match[1] ?? ''
    const className = /className="([^"]*)"/.exec(attrs)
    return className?.[1] ?? ''
  })
}

describe('an admin list table collects its slack in one column, not every column', () => {
  it('marks every column as either the one that grows or one that stays tight', () => {
    for (const file of ADMIN_TABLES) {
      const source = readFileSync(join(SRC, file), 'utf8')
      const heads = tableHeadClasses(source)
      expect(heads.length, file).toBeGreaterThan(1)

      const growing = heads.filter((cls) => /(^|\s)w-full(\s|$)/.test(cls))
      expect(growing.length, file).toBeGreaterThan(0)

      const shrinking = heads.filter((cls) => !/(^|\s)w-full(\s|$)/.test(cls))
      for (const cls of shrinking) {
        expect(cls, `${file}: ${cls}`).toContain('w-px')
        expect(cls, `${file}: ${cls}`).toContain('whitespace-nowrap')
      }
    }
  })

  it('still checks real files, so the rule cannot pass by watching none', () => {
    for (const file of ADMIN_TABLES) {
      expect(() => readFileSync(join(SRC, file), 'utf8'), file).not.toThrow()
    }
  })
})
