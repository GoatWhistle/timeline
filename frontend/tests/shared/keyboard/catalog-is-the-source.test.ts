import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG, catalogEntry } from '@/shared/keyboard/shortcut-catalog'

const SRC = join(process.cwd(), 'src')
const OWN = 'shared/keyboard/shortcut-catalog/catalog.ts'

const LITERAL_KEYS = /\bkeys:\s*\[\s*'/

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).split(sep).join('/')

describe('the catalogue is the only place a shortcut is defined', () => {
  it('declares every id exactly once', () => {
    const ids = CATALOG.flatMap((section) => section.shortcuts).map((entry) => entry.id)
    expect(ids).toHaveLength(new Set(ids).size)
  })

  it('is the only file that spells out a literal combination for a shortcut', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => named(file) !== OWN)
      .filter((file) => LITERAL_KEYS.test(readFileSync(file, 'utf8')))
      .map(named)

    expect(offenders).toEqual([])
  })

  it('gives every entry a title key and a combination that is not empty', () => {
    for (const section of CATALOG) {
      expect(section.shortcuts.length, section.id).toBeGreaterThan(0)
      for (const entry of section.shortcuts) {
        expect(entry.titleKey, entry.id).toMatch(/\./)
        expect(entry.keys.length, entry.id).toBeGreaterThan(0)
        for (const combo of entry.keys) expect(combo.trim(), entry.id).not.toBe('')
      }
    }
  })

  it('refuses an id it does not know, rather than inventing a blank shortcut', () => {
    expect(() => catalogEntry('not-a-shortcut')).toThrow()
  })

  it('holds every shortcut the pages register, so none is reachable only from its page', () => {
    const registered = new Set<string>()
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/catalogEntry\('([^']+)'\)/g)) {
        const id = match[1]
        if (id) registered.add(id)
      }
    }

    const known = new Set(CATALOG.flatMap((section) => section.shortcuts).map((e) => e.id))
    expect([...registered].filter((id) => !known.has(id))).toEqual([])
    expect(registered.size).toBeGreaterThan(0)
  })
})
