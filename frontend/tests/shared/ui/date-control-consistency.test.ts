import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const PICKER = 'shared/ui/forms/calendar/date-picker.tsx'

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

const files = tsxFiles(SRC)

function offenders(pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map(named)
}

describe('a date is picked the same way everywhere, in the language of the app', () => {
  it('no screen falls back to a native date field, whose format follows the browser', () => {
    expect(offenders(/type="date"/)).toEqual([])
  })

  it('no screen falls back to a native datetime field either', () => {
    expect(offenders(/type="datetime-local"/)).toEqual([])
  })

  it('the shared picker spells the date in one order everywhere, not the browser one', () => {
    const source = readFileSync(join(SRC, PICKER), 'utf8')

    expect(source).toContain('DATE_TEXT_PATTERN')
    expect(source).toContain('formatDateText')
  })

  it('the shared picker holds a plain text field, which no user agent reformats', () => {
    const source = readFileSync(join(SRC, PICKER), 'utf8')

    expect(source).toContain('type="text"')
    expect(source).not.toContain('type="date"')
  })
})
