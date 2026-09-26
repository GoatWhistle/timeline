import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const NUMBERS = [
  { file: 'features/schedule/ui/wrapped-grid/wrapped-grid.module.css', selector: '.cellNumber' },
  { file: 'features/schedule/ui/week-grid/week-grid.module.css', selector: '.dayNumber' },
  { file: 'features/schedule/ui/phone-month/phone-month.module.css', selector: '.number' },
]

function rule(source: string, selector: string): string {
  const at = source.indexOf(`${selector} {`)
  if (at < 0) return ''
  return source.slice(at, source.indexOf('}', at))
}

function px(body: string, property: string): number | undefined {
  const match = new RegExp(`(^|\\n)\\s*${property}:\\s*(\\d+)px`).exec(body)
  return match ? Number(match[2]) : undefined
}

describe('the day number is drawn in a circle, so today stays round with two digits', () => {
  it('fixes the number to a square that the pill radius turns into a circle', () => {
    for (const { file, selector } of NUMBERS) {
      const body = rule(readFileSync(join(SRC, file), 'utf8'), selector)
      expect(body, `${file} lost ${selector}`).not.toBe('')
      const width = px(body, 'inline-size')
      expect(width, `${file}: the width floats with the digits`).toBeDefined()
      expect(width, `${file}: the circle is stretched into an oval`).toBe(px(body, 'block-size'))
      expect(body, `${file}: a min-width lets two digits widen it`).not.toMatch(/min-width/)
      expect(body, `${file}: side padding widens it past its height`).not.toMatch(/padding-inline/)
      expect(body).toContain('border-radius: var(--radius-pill')
    }
  })
})
