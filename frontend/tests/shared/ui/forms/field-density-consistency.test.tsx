import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const FIELD_GAP = 'gap-4'

const SUBMIT = /<Button\b[^>]*type="submit"/

const SECTIONED = ['entities/event/event-flat-form.tsx', 'entities/event/event-staged-form.tsx']

const COMPACT: string[] = []

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

const files = tsxFiles(SRC).map((file) => ({
  file: named(file),
  source: readFileSync(file, 'utf8'),
}))

const formOpening = (source: string): string | null => {
  const at = source.indexOf('<form')
  if (at === -1) return null
  const end = source.indexOf('>', at)
  return end === -1 ? null : source.slice(at, end)
}

const gapOf = (opening: string): string | null => opening.match(/\bgap-(\d+)\b/)?.[0] ?? null

const submitting = () => files.filter(({ source }) => SUBMIT.test(source))

describe('a form stacks its fields at one density across the product', () => {
  it('every field-stacking form separates its fields by the same gap', () => {
    const offenders = submitting()
      .filter(({ file }) => !SECTIONED.includes(file) && !COMPACT.includes(file))
      .filter(({ source }) => {
        const opening = formOpening(source)
        if (opening === null || !/\bflex-col\b/.test(opening)) return false
        return gapOf(opening) !== FIELD_GAP
      })
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })

  it('no field stack anywhere picks a gap between the field gap and the section gap', () => {
    const offenders: string[] = []
    for (const { file, source } of files) {
      for (const row of source.matchAll(/className="([^"]*\bflex-col\b[^"]*)"/g)) {
        const classes = row[1] ?? ''
        if (!/\bgap-5\b/.test(classes)) continue
        const after = source.slice((row.index ?? 0) + row[0].length, (row.index ?? 0) + 300)
        if (!/<Field\b/.test(after)) continue
        offenders.push(file)
      }
    }

    expect(offenders).toEqual([])
  })

  it('a row of fields side by side uses the field gap too, not a tighter one', () => {
    const offenders: string[] = []
    for (const { file, source } of files) {
      for (const row of source.matchAll(/className="([^"]*\bsm:flex-row\b[^"]*)"/g)) {
        const classes = row[1] ?? ''
        const gap = gapOf(classes)
        if (gap === null || gap === FIELD_GAP) continue
        const after = source.slice((row.index ?? 0) + row[0].length, (row.index ?? 0) + 300)
        if (!/<Field\b/.test(after)) continue
        offenders.push(`${file} (${gap})`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('the declared exemptions still exist and are still shaped the way they were excused', () => {
    for (const file of [...SECTIONED, ...COMPACT]) {
      const source = readFileSync(join(SRC, file), 'utf8')
      const opening = formOpening(source)
      expect(opening).not.toBeNull()
      expect(gapOf(String(opening))).not.toBeNull()
    }

    for (const file of SECTIONED) {
      const source = readFileSync(join(SRC, file), 'utf8')
      expect(source).toContain('data-event-form')
    }
  })
})
