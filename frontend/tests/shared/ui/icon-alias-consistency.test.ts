import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import * as lucideNamespace from 'lucide-react'
import { describe, expect, it } from 'vitest'

const lucide: Record<string, unknown> = { ...lucideNamespace }

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

type IconLike = { displayName?: string }

function isIcon(value: unknown): value is IconLike {
  return typeof value === 'object' && value !== null && 'displayName' in value
}

function aliasGroups(): Map<unknown, string[]> {
  const byGlyph = new Map<unknown, string[]>()
  for (const [name, value] of Object.entries(lucide)) {
    if (!/^[A-Z]/.test(name) || !isIcon(value)) continue
    byGlyph.set(value, [...(byGlyph.get(value) ?? []), name])
  }
  return byGlyph
}

function canonical(names: string[]): string {
  const first = lucide[names[0] ?? '']
  return (isIcon(first) ? first.displayName : undefined) ?? ''
}

function imported(source: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = piece.split(/\s+as\s+/)[0]?.trim() ?? ''
      if (name !== '') found.push(name)
    }
  }
  return found
}

describe('an icon is imported under one name, never under two names for one glyph', () => {
  const groups = [...aliasGroups().values()].filter((names) => names.length > 1)

  it('finds that lucide really does ship the same glyph under several names', () => {
    expect(groups.length).toBeGreaterThan(0)
    for (const names of groups) {
      const first = lucide[names[0] ?? '']
      for (const name of names) expect(lucide[name], name).toBe(first)
      expect(names, names.join('/')).toContain(canonical(names))
    }
  })

  it('imports each shared glyph under the one canonical name across the whole tree', () => {
    const preferred = new Map<string, string>()
    for (const names of groups) {
      const pick = canonical(names)
      for (const name of names) if (name !== pick) preferred.set(name, pick)
    }

    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      for (const name of imported(source)) {
        const pick = preferred.get(name)
        if (pick !== undefined) offenders.push(`${named(file)}: ${name} should be ${pick}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
