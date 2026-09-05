import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDateRange, formatMomentRange } from '@/shared/datetime/datetime'

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

const HAND_ROLLED = /format(Date|DateTime|EventDay)\([^)]*\)\s*\}?\s*—/

describe('a period between two moments is printed by one formatter, not by hand', () => {
  it('collapses a one-day event to a single day instead of repeating it', () => {
    const text = formatDateRange('2025-09-05T09:00:00Z', '2025-09-05T18:00:00Z', 'en')
    expect(text).not.toContain('—')
    expect(formatDateRange('2025-09-05T09:00:00Z', '2025-09-07T18:00:00Z', 'en')).toContain('—')
  })

  it('keeps both times of a same-day stage, printing the day only once', () => {
    const text = formatMomentRange('2025-09-05T09:00:00Z', '2025-09-05T18:00:00Z', 'en')
    expect(text).toContain('—')
    expect(text.match(/September/g)).toHaveLength(1)
  })

  it('spans the full date on both sides when a stage crosses midnight', () => {
    const text = formatMomentRange('2025-09-05T09:00:00Z', '2025-09-07T18:00:00Z', 'en')
    expect(text.match(/September/g)).toHaveLength(2)
  })

  it('answers the shared placeholder when there is no start at all', () => {
    expect(formatDateRange(null, null, 'en')).toBe('—')
    expect(formatMomentRange(null, null, 'en')).toBe('—')
  })

  it('lets no screen join two formatted moments with a dash of its own', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      if (HAND_ROLLED.test(source)) offenders.push(named(file))
    }
    expect(offenders.sort()).toEqual([])
  })
})
