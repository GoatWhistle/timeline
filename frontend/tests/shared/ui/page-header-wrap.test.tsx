import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from '@/shared/ui/layout/page-header'

const SRC = join(process.cwd(), 'src')
const HEADER = join(SRC, 'shared/ui/layout/page-header.tsx')

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

function headerRow(container: HTMLElement): HTMLElement {
  const heading = container.querySelector('h1')
  const row = heading?.parentElement?.parentElement
  if (!row) throw new Error('the page header row was not found')
  return row
}

describe('a page title keeps its room when actions sit beside it', () => {
  it('lets the row wrap, so a wide action drops below instead of squeezing the title', () => {
    const { container } = render(
      <PageHeader title="Deadlines" description="A description" actions={<div>action</div>} />,
    )
    expect(headerRow(container).className).toContain('flex-wrap')
  })

  it('never lets the title column shrink below its own text, which is what clipped Deadlines', () => {
    const { container } = render(<PageHeader title="Deadlines" actions={<div>action</div>} />)
    const column = container.querySelector('h1')?.parentElement
    expect(column?.className).toContain('min-w-min')
    expect(column?.className).not.toContain('min-w-0')
  })

  it('caps the description to a readable measure, so a wide screen never runs it edge to edge', () => {
    const { container } = render(<PageHeader title="Deadlines" description="A description" />)
    const paragraph = container.querySelector('p')
    expect(paragraph?.className).toContain('max-w-prose')
  })

  it('keeps the action group unshrunk, so wrapping is what yields, not the control', () => {
    const { container } = render(<PageHeader title="Deadlines" actions={<div>action</div>} />)
    const row = headerRow(container)
    expect(row.lastElementChild?.className).toContain('shrink-0')
  })

  it('never lets a screen rebuild the title-beside-actions row without letting it wrap', () => {
    const offenders: string[] = []
    for (const file of tsxFiles(SRC)) {
      if (file === HEADER) continue
      const source = readFileSync(file, 'utf8')
      for (const row of source.matchAll(/className="([^"]*\bjustify-between\b[^"]*)"/g)) {
        const classes = row[1] ?? ''
        if (!/\bflex\b/.test(classes)) continue
        if (/\bflex-wrap\b|\bflex-col\b/.test(classes)) continue
        const after = source.slice((row.index ?? 0) + row[0].length, (row.index ?? 0) + 400)
        if (!/<h1\b/.test(after)) continue
        offenders.push(named(file))
      }
    }

    expect(offenders).toEqual([])
  })
})
