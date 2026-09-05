import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'

const STYLES = join(process.cwd(), 'src/features/schedule/ui/week-grid/week-grid.module.css')

describe('the week grid takes the room a big screen offers', () => {
  const css = readFileSync(STYLES, 'utf8')
  const body = css.slice(css.indexOf('.body {'), css.indexOf('}', css.indexOf('.body {')))

  it('caps its own height at nothing, so a whole day is drawn rather than hidden', () => {
    expect(body).toContain('max-height: none')
    expect(body).not.toMatch(/max-height:\s*clamp/)
  })

  it('scrolls the page instead of trapping the day inside its own scroller', () => {
    expect(body).not.toMatch(/overflow-y:\s*(auto|scroll)/)
  })
})

describe('a wide screen is used, not left empty', () => {
  it('lets the page reach past the width a laptop has', () => {
    const cap = Number(PAGE_WIDTH.match(/max-w-\[(\d+)px\]/)?.[1] ?? 0)
    expect(cap).toBeGreaterThanOrEqual(1900)
  })
})
