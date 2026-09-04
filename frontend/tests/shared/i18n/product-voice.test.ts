import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '@/shared/i18n/locale'

const LOCALE_DIR = join(process.cwd(), 'src', 'shared', 'i18n', 'locales')

const JARGON = [
  { term: 'MVP', why: 'names a project phase the reader has no reason to know' },
  { term: 'TBD', why: 'is a placeholder that should never ship' },
  { term: 'TODO', why: 'is a placeholder that should never ship' },
  { term: 'FIXME', why: 'is a placeholder that should never ship' },
  { term: 'lorem ipsum', why: 'is filler text that should never ship' },
  { term: 'endpoint', why: 'is an implementation word, not a product word' },
  { term: 'payload', why: 'is an implementation word, not a product word' },
  { term: 'backend', why: 'is an implementation word, not a product word' },
  { term: 'frontend', why: 'is an implementation word, not a product word' },
  { term: 'null', why: 'is a programming value leaking into a sentence' },
  { term: 'undefined', why: 'is a programming value leaking into a sentence' },
]

function flatten(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === 'string') return [[path.join('.'), value]]
  if (value === null || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flatten(nested, [...path, key]),
  )
}

function sentences(locale: string): [string, string][] {
  const dir = join(LOCALE_DIR, locale)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) =>
      flatten(JSON.parse(readFileSync(join(dir, name), 'utf8'))).map(
        ([key, text]) => [`${name}:${key}`, text] as [string, string],
      ),
    )
}

describe.each(LOCALES)('%s reads as product text, not as developer notes', (locale) => {
  const entries = sentences(locale)

  it('finds sentences to check at all', () => {
    expect(entries.length).toBeGreaterThan(100)
  })

  it.each(JARGON)('never says $term, which $why', ({ term }) => {
    const pattern = new RegExp(`(^|[^\\p{L}])${term}([^\\p{L}]|$)`, 'iu')
    const offenders = entries
      .filter(([, text]) => pattern.test(text))
      .map(([key, text]) => `${key} = ${text}`)

    expect(offenders, offenders.join('\n')).toHaveLength(0)
  })

  it('leaves no sentence empty or blank', () => {
    for (const [key, text] of entries) {
      expect(text.trim(), key).not.toHaveLength(0)
    }
  })
})
