import type { Dirent } from 'node:fs'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import enErrors from '@/shared/i18n/locales/en/errors.json'
import ruErrors from '@/shared/i18n/locales/ru/errors.json'

const BACKEND = resolve(__dirname, '../../../../backend')

function vanished(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EPERM' || code === 'EBUSY'
}

function goFiles(dir: string): string[] {
  const out: string[] = []
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    if (vanished(error)) return out
    throw error
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...goFiles(full))
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.go') &&
      !entry.name.endsWith('.gen.go') &&
      !entry.name.endsWith('_test.go')
    ) {
      out.push(full)
    }
  }
  return out
}

function readStable(file: string): string | undefined {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return readFileSync(file, 'utf8')
    } catch (error) {
      if (!vanished(error)) throw error
    }
  }
  return undefined
}

function serverCodes(): Set<string> {
  const codes = new Set<string>()
  const patterns = [
    /NewConflict\(\s*"([a-z_]+)"/g,
    /Code:\s*"([a-z_]+)"/g,
    /simple\(\s*"([a-z_]+)"/g,
  ]
  for (const file of goFiles(join(BACKEND, 'internal'))) {
    const source = readStable(file)
    if (source === undefined) continue
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
