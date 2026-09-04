import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const RESET = join(SRC, 'styles/reset.css')

const MOVING = /transform|translate|scale|rotate|margin|width|height|opacity|inset|top|left/

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

const files = sourceFiles(SRC)

function gatedTransitions(): { file: string; utility: string }[] {
  const found: { file: string; utility: string }[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/motion-safe:transition-(\[[^\]]*\]|[a-z-]+)/g)) {
      found.push({ file: named(file), utility: match[1] ?? '' })
    }
  }
  return found
}

describe('a colour change is not motion, and the gate says so exactly once', () => {
  it('the reset already stops every transition for a reader who asked for less motion', () => {
    const reset = readFileSync(RESET, 'utf8')
    const block = reset.slice(reset.indexOf('prefers-reduced-motion: reduce'))

    expect(block).toContain('transition-duration: 0.01ms !important')
    expect(block).toContain('animation-duration: 0.01ms !important')
  })

  it('no colour transition carries a motion gate, the reset having already covered it', () => {
    const colourOnly = gatedTransitions().filter(({ utility }) => !MOVING.test(utility))

    expect(colourOnly).toEqual([])
  })

  it('every surviving motion gate guards a property that actually displaces something', () => {
    const gated = gatedTransitions()

    expect(gated.length).toBeGreaterThan(0)
    for (const { file, utility } of gated) {
      expect(`${file} ${utility}`).toMatch(MOVING)
    }
  })

  it('a colour transition is spelled the one plain way across the whole app', () => {
    const offenders = files
      .filter((file) => /motion-safe:transition-colors/.test(readFileSync(file, 'utf8')))
      .map(named)

    expect(offenders).toEqual([])
  })
})
