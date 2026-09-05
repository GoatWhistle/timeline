import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'

const source = readFileSync(
  resolve(process.cwd(), 'src/features/event-card/event-card.tsx'),
  'utf8',
)

describe('the event page fills a wide screen instead of a narrow column', () => {
  it('does not pin the page into the old narrow column', () => {
    expect(source).not.toContain('max-w-4xl')
  })

  it('gives the page a width that a wide screen can use', () => {
    expect(source).toMatch(/className=\{PAGE_WIDTH\}/)
    expect(PAGE_WIDTH).toMatch(/max-w-\[\d+px\]/)
  })
})

describe('the facts sidebar sticks only once it is a sidebar', () => {
  const asideClass = source.match(/<aside className="([^"]+)"/)?.[1] ?? ''
  const columnBreakpoint = source.match(/(\w+):grid-cols-\[minmax\(0,1fr\)_320px\]/)?.[1] ?? ''

  it('turns the aside into a column at the same breakpoint that splits the grid', () => {
    expect(columnBreakpoint).not.toBe('')
    expect(asideClass).toContain(`${columnBreakpoint}:sticky`)
  })

  it('never sticks while the aside is still a full-width block', () => {
    expect(asideClass).not.toContain('lg:sticky')
  })
})
