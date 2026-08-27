import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import enErrors from '@/shared/i18n/locales/en/errors.json'
import ruErrors from '@/shared/i18n/locales/ru/errors.json'

const BACKEND = resolve(__dirname, '../../../../backend')

function goFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...goFiles(full))
    } else if (entry.endsWith('.go') && !entry.endsWith('.gen.go')) {
      out.push(full)
    }
  }
  return out
}

function serverCodes(): Set<string> {
  const codes = new Set<string>()
  const patterns = [
    /NewConflict\(\s*"([a-z_]+)"/g,
    /Code:\s*"([a-z_]+)"/g,
    /simple\(\s*"([a-z_]+)"/g,
  ]
  for (const file of goFiles(join(BACKEND, 'internal'))) {
    const source = readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const code = match[1]
        if (code) codes.add(code)
      }
    }
  }
  return codes
}

describe('error dictionaries', () => {
  it('cover every code the server can emit', () => {
    const emitted = [...serverCodes()].sort()
    expect(emitted.length).toBeGreaterThan(0)
    expect(Object.keys(enErrors).sort()).toEqual(emitted)
  })

  it('keep ru and en key sets identical', () => {
    expect(Object.keys(ruErrors).sort()).toEqual(Object.keys(enErrors).sort())
  })

  it('leave no message empty', () => {
    for (const table of [enErrors, ruErrors]) {
      for (const [code, message] of Object.entries(table)) {
        expect(message, code).not.toHaveLength(0)
      }
    }
  })
})
