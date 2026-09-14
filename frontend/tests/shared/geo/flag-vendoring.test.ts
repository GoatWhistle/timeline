import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { flagSource } from '@/shared/geo/flag'
import { FLAG_CODES } from '@/shared/geo/flag-codes.gen'

const FLAG_DIR = join(process.cwd(), 'public', 'flags')
const GZIP_BUDGET = 400

function vendored(): string[] {
  return readdirSync(FLAG_DIR)
    .filter((name) => name.endsWith('.svg'))
    .map((name) => name.replace('.svg', ''))
}

describe('the vendored flag set', () => {
  it('carries on disk exactly the codes the manifest promises', () => {
    expect([...FLAG_CODES].sort()).toEqual(vendored().sort())
  })

  it('names a file that truly exists for every code it resolves', () => {
    for (const code of FLAG_CODES) {
      const source = flagSource(code)
      expect(source, code).toBe(`/flags/${code}.svg`)
      expect(() => readFileSync(`${FLAG_DIR}/${code}.svg`), code).not.toThrow()
    }
  })

  it('keeps every vendored flag inside the size budget that justified shipping it', () => {
    for (const code of vendored()) {
      const gzip = gzipSync(readFileSync(`${FLAG_DIR}/${code}.svg`), { level: 9 }).length
      expect(gzip, `${code}.svg is too heavy to ship`).toBeLessThanOrEqual(GZIP_BUDGET)
    }
  })

  it('carries the two flags the language switcher depends on', () => {
    expect(FLAG_CODES.has('gb'), 'English is offered under the British flag').toBe(true)
    expect(FLAG_CODES.has('ru'), 'Russian is offered under the Russian flag').toBe(true)
  })

  it('resolves nothing for a code outside the set, and never throws', () => {
    expect(flagSource('ZZ')).toBeNull()
    expect(flagSource(null)).toBeNull()
    expect(flagSource(undefined)).toBeNull()
    expect(flagSource('')).toBeNull()
    expect(flagSource('NLD')).toBeNull()
    expect(flagSource('1')).toBeNull()
  })

  it('resolves a country however the server spells its case', () => {
    expect(flagSource('nl')).toBe('/flags/nl.svg')
    expect(flagSource('NL')).toBe('/flags/nl.svg')
    expect(flagSource('Nl')).toBe('/flags/nl.svg')
  })
})
