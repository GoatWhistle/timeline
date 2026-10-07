import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const NO_VALUE = join(SRC, 'shared/ui/data-display/no-value/no-value.tsx')
const DATETIME = join(SRC, 'shared/datetime/datetime.ts')

function sourceFiles(dir: string, extension: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full, extension))
    else if (entry.name.endsWith(extension)) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

const LONE_DASH = /(['"`]\s*—\s*['"`]|>\s*—\s*<|=\s*\{\s*'—'\s*\})/g

const ADOPTED = [
  'entities/catalog/catalog-table-row.tsx',
  'features/audit-log/audit-detail-dialog.tsx',
  'features/notification-preview/preview-body.tsx',
  'features/participants/participants-table/participants-table.tsx',
  'features/registration/statuses-table/statuses-table.tsx',
  'shared/ui/primitives/deadline-time/deadline-time.tsx',
]

describe('the placeholder standing in for a value nobody set is written one way', () => {
  it('keeps the dash and its spoken name inside the shared primitive', () => {
    const source = readFileSync(NO_VALUE, 'utf8')
    expect(source).toContain("NO_VALUE_DASH = '—'")
    expect(source).toContain('aria-hidden="true"')
    expect(source).toContain('sr-only')
    expect(source).toContain("t('novalue.unset')")
  })

  it('lets no screen stand a lone dash in for a missing value', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC, '.tsx')) {
      if (file === NO_VALUE) continue
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(LONE_DASH)) {
        offenders.push(`${named(file)}: ${match[0].trim()}`)
      }
    }
    expect(offenders.sort()).toEqual([])
  })

  it('has every screen that shows an absent value take it from the shared primitive', () => {
    for (const relPath of ADOPTED) {
      const source = readFileSync(join(SRC, relPath), 'utf8')
      expect(source, relPath).toContain("from '@/shared/ui/data-display/no-value/no-value'")
      expect(source, relPath).toMatch(/<NoValue[\s/>]/)
    }
  })

  it('leaves the dash inside the datetime formatters, which return a plain string', () => {
    expect(readFileSync(DATETIME, 'utf8')).toContain("return '—'")
  })
})
