import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const ADMIN_TABLES = ['features/audit-log/audit-log.tsx']
const PLAIN_TABLES = ['features/user-list/user-table.tsx']

function tableHeadClasses(source: string): string[] {
  return [...source.matchAll(/<TableHead\b([^>]*)>/g)].map((match) => {
    const attrs = match[1] ?? ''
    const className = /className="([^"]*)"/.exec(attrs)
    return className?.[1] ?? ''
  })
}

function columnWidthValues(source: string): string[] {
  const block = /const COLUMN_WIDTH[^=]*=\s*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? ''
  return [...block.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? '')
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

  it('collects the slack in one column when the table is built by hand too', () => {
    for (const file of PLAIN_TABLES) {
      const source = readFileSync(join(SRC, file), 'utf8')
      const widths = columnWidthValues(source)
      expect(widths.length, file).toBeGreaterThan(1)

      const growing = widths.filter((cls) => /(^|\s)w-full(\s|$)/.test(cls))
      expect(growing.length, `${file}: ${widths.join(' | ')}`).toBe(1)

      for (const cls of widths.filter((item) => !/(^|\s)w-full(\s|$)/.test(item))) {
        expect(cls, `${file}: ${cls}`).toContain('w-px')
        expect(cls, `${file}: ${cls}`).toContain('whitespace-nowrap')
      }
    }
  })

  it('still checks real files, so the rule cannot pass by watching none', () => {
    for (const file of [...ADMIN_TABLES, ...PLAIN_TABLES]) {
      expect(() => readFileSync(join(SRC, file), 'utf8'), file).not.toThrow()
    }
  })
})
