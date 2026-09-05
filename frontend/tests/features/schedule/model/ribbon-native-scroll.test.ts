import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RIBBON_MODEL = join(process.cwd(), 'src', 'features', 'schedule', 'model', 'ribbon')
const RIBBON_UI = join(process.cwd(), 'src', 'features', 'schedule', 'ui', 'ribbon')

const SOURCES = [
  join(RIBBON_MODEL, 'use-ribbon-scroll.ts'),
  join(RIBBON_UI, 'ribbon-grid.tsx'),
  join(RIBBON_UI, 'ribbon-band.tsx'),
  join(RIBBON_UI, 'ribbon-hours.tsx'),
  join(RIBBON_UI, 'ribbon-rulers.tsx'),
]

function sourceOf(file: string): string {
  return readFileSync(file, 'utf8')
}

describe('the ribbon scrolls the way the browser already scrolls', () => {
  it.each(SOURCES)('%s listens for no wheel event of its own', (file) => {
    const source = sourceOf(file)

    expect(source).not.toMatch(/addEventListener\(\s*['"]wheel['"]/)
    expect(source).not.toMatch(/onWheel\s*=/)
  })

  it.each(SOURCES)('%s translates no key into a sideways move', (file) => {
    const source = sourceOf(file)

    expect(source).not.toMatch(/addEventListener\(\s*['"]key(down|up|press)['"]/)
    expect(source).not.toMatch(/onKeyDown\s*=\s*\{(?!\(\)\s*=>\s*undefined)/)
    expect(source).not.toContain('ArrowLeft')
    expect(source).not.toContain('ArrowRight')
  })

  it.each(SOURCES)('%s never cancels the default of a scroll gesture', (file) => {
    expect(sourceOf(file)).not.toContain('preventDefault')
  })

  it('keeps the viewport a plain scroll container the browser drives', () => {
    const sheet = readFileSync(join(RIBBON_UI, 'ribbon.module.css'), 'utf8')
    const viewport = sheet.slice(sheet.indexOf('.viewport {'), sheet.indexOf('.canvas {'))

    expect(viewport).toMatch(/overflow(-x)?:\s*auto/)
  })

  it('exports no wheel or key translation for anyone else to reach for', async () => {
    const module = await import('@/features/schedule/model/ribbon/use-ribbon-scroll')

    expect(Object.keys(module)).not.toContain('wheelShift')
    expect(Object.keys(module)).not.toContain('keyShift')
    expect(Object.keys(module)).not.toContain('canAbsorb')
  })
})
