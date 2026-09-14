import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const SUBMIT = /<Button\b[^>]*type="submit"/

const STRETCHED = [
  'features/auth/login/login.tsx',
  'features/auth/register/register.tsx',
  'features/password-reset/request/password-reset-request.tsx',
  'features/password-reset/confirm/password-reset-confirm.tsx',
  'features/profile/nickname-card/nickname-card.tsx',
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

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

function footerOf(source: string, at: number): string | null {
  const dialog = source.lastIndexOf('<DialogFooter', at)
  if (dialog !== -1 && source.lastIndexOf('</DialogFooter>', at) < dialog) return 'justify-end'
  const opened = source.lastIndexOf('<div', at)
  const closed = source.lastIndexOf('</div>', at)
  if (opened === -1 || closed > opened) return null
  const end = source.indexOf('>', opened)
  return end === -1 ? null : source.slice(opened, end)
}

function submitFiles(): { file: string; source: string }[] {
  return tsxFiles(SRC)
    .map((file) => ({ file: named(file), source: readFileSync(file, 'utf8') }))
    .filter(({ source }) => SUBMIT.test(source))
}

const PUSHED_RIGHT = /\bjustify-end\b|\bml-auto\b/

describe('a form confirms in one corner across the product', () => {
  it('every form that submits is either a right-aligned footer or a declared stretched one', () => {
    const offenders = submitFiles()
      .filter(({ file }) => !STRETCHED.includes(file))
      .filter(({ source }) => {
        const at = source.search(SUBMIT)
        const footer = footerOf(source, at)
        return footer === null || !PUSHED_RIGHT.test(footer)
      })
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })

  it('the event form footer is right-aligned, which is where it drifted from', () => {
    const source = readFileSync(join(SRC, 'entities/event/event-flat-form.tsx'), 'utf8')
    const footer = footerOf(source, source.search(SUBMIT))
    expect(footer).not.toBeNull()
    expect(PUSHED_RIGHT.test(String(footer))).toBe(true)
  })

  it('no footer keeps a confirm button to the left of the buttons beside it', () => {
    const offenders = submitFiles()
      .filter(({ file }) => !STRETCHED.includes(file))
      .filter(({ source }) => {
        const at = source.search(SUBMIT)
        const opened = source.lastIndexOf('<div', at)
        if (opened === -1) return false
        const cancel = source.indexOf('action.cancel', opened)
        return cancel !== -1 && cancel > at
      })
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })

  it('the stretched exemptions still exist and still place the button outside a footer row', () => {
    for (const file of STRETCHED) {
      const source = readFileSync(join(SRC, file), 'utf8')
      expect(SUBMIT.test(source)).toBe(true)
      const footer = footerOf(source, source.search(SUBMIT))
      expect(footer === null || !PUSHED_RIGHT.test(footer)).toBe(true)
    }
  })
})
