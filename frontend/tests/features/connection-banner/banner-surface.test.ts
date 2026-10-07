import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const BANNERS = [
  'features/auth/verification-banner/verification-banner.tsx',
  'features/connection-banner/connection-banner.tsx',
]

const SURFACE = [
  'mb-4',
  'rounded-control',
  'border',
  'border-border',
  'bg-surface-1',
  'px-3',
  'py-2',
]

function statusClasses(source: string): string[] {
  const at = source.indexOf('role="status"')
  const match = /className="([^"]*)"/.exec(source.slice(at))
  return (match?.[1] ?? '').split(/\s+/)
}

describe('every notice above a page sits on the same rounded card', () => {
  it('draws the connection notice and the address notice on one surface', () => {
    for (const file of BANNERS) {
      const classes = statusClasses(readFileSync(join(SRC, file), 'utf8'))
      for (const token of SURFACE) expect(classes, `${file} lacks ${token}`).toContain(token)
    }
  })

  it('no longer stretches the connection notice edge to edge as a flat strip', () => {
    const source = readFileSync(join(SRC, BANNERS[1] ?? ''), 'utf8')
    expect(source).not.toContain('.module.css')
    expect(source).not.toMatch(/justify-center/)
  })
})
