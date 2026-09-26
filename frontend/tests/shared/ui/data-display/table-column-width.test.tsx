import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const RESIZABLE = 'shared/ui/data-display/column-resize/resizable-table.tsx'
const NOT_A_DATA_TABLE = [
  'shared/ui/forms/calendar/calendar-grid.tsx',
  'shared/ui/states/skeleton-table/skeleton-table.tsx',
]

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const files = tsxFiles(SRC).map((file) => ({
  name: relative(SRC, file).replaceAll('\\', '/'),
  source: readFileSync(file, 'utf8'),
}))

const users = files.filter(
  (file) => file.name !== RESIZABLE && file.source.includes('<ResizableTable'),
)

describe('every data table lets its columns be dragged wider, with one column taking the slack', () => {
  it('builds no data table by hand, so none can skip the resize handles', () => {
    const handRolled = files
      .filter((file) => file.source.includes('<table'))
      .map((file) => file.name)
      .filter((name) => name !== RESIZABLE && !NOT_A_DATA_TABLE.includes(name))
    expect(handRolled).toEqual([])
  })

  it('names the one column that takes the slack in every table', () => {
    expect(users.length, 'the rule watches no table').toBeGreaterThanOrEqual(9)
    for (const file of users) {
      expect(file.source, `${file.name} has no growing column`).toMatch(/\bflexible=/)
    }
  })

  it('heads every named column with the resizable head, never the bare one', () => {
    for (const file of users) {
      const bare = [...file.source.matchAll(/<(TableHead|th)\b[^>]*>([\s\S]*?)<\/(TableHead|th)>/g)]
        .map((match) => match[2] ?? '')
        .filter((inner) => /\{t\(/.test(inner))
        .filter((inner) => !/<Checkbox\b/.test(inner) && !/\bsr-only\b/.test(inner))
      expect(bare, `${file.name} still labels a column it cannot resize`).toEqual([])
      expect(file.source, file.name).toMatch(/<ResizableHead\b|<EventHeaderCell\b/)
    }
  })

  it('every exemption still names a file that really builds a table', () => {
    for (const name of NOT_A_DATA_TABLE) {
      expect(readFileSync(join(SRC, name), 'utf8'), name).toContain('<table')
    }
  })
})
