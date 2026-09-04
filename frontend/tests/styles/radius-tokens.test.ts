import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const NAMED = ['badge', 'control', 'surface', 'pill']

const UNGOVERNED = /\brounded-(?:[trbl]{1,2}-)?(sm|md|lg|xl|2xl|3xl|full)\b/

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
      continue
    }
    if (/\.(tsx?|css)$/.test(entry)) found.push(path)
  }
  return found
}

describe('radius tokens', () => {
  it('declares only the four named radii', () => {
    const theme = readFileSync(join(SRC, 'styles', 'index.css'), 'utf8')
    const declared = [...theme.matchAll(/^\s*--radius-([a-z0-9-]+):/gm)].map((match) => match[1])

    expect([...new Set(declared)].sort()).toEqual([...NAMED].sort())
  })

  it('never rounds a corner outside the named scale', () => {
    const offenders = sourceFiles(SRC)
      .filter((path) => UNGOVERNED.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1))

    expect(offenders).toEqual([])
  })
})
