import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/shared/ui/data-display/empty-state'

const SRC = join(process.cwd(), 'src')

const DATA_DISPLAY = 'shared/ui/data-display'

const FIGURE_FRAME = `${DATA_DISPLAY}/empty-figures/figure-frame.tsx`

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

function offenders(match: (source: string, file: string) => boolean): string[] {
  return files.filter((file) => match(readFileSync(file, 'utf8'), named(file))).map(named)
}

describe('an empty or failed pane is drawn once, by the shared components', () => {
  it('nothing outside the shared figure module opens its own labelled figure canvas', () => {
    const OWN_CANVAS = /<svg[^>]*\srole="img"/

    expect(offenders((source, file) => file !== FIGURE_FRAME && OWN_CANVAS.test(source))).toEqual(
      [],
    )
  })

  it('nothing respells the spinning brand mark that every figure already carries', () => {
    const SPIN = /animate-\[spin_9s_linear_infinite\]/

    expect(offenders((source, file) => file !== FIGURE_FRAME && SPIN.test(source))).toEqual([])
  })

  it('no screen builds its own centred full-pane empty state beside the shared one', () => {
    const OWN_PANE = /min-h-\[(?:24rem|70vh)\][^'"\n]*items-center[^'"\n]*justify-center/

    expect(
      offenders((source, file) => !file.startsWith(`${DATA_DISPLAY}/`) && OWN_PANE.test(source)),
    ).toEqual([])
  })

  it('the shared pane is where that geometry actually lives', () => {
    const source = readFileSync(join(SRC, DATA_DISPLAY, 'empty-state.tsx'), 'utf8')

    expect(source).toContain('min-h-[24rem]')
    expect(source).toContain('items-center')
    expect(source).toContain('justify-center')
  })
})

describe('the shared pane keeps one typography for the title and the description', () => {
  function paneOf(ui: React.ReactElement) {
    renderWithProviders(ui)
    return screen.getByText('Nothing here')
  }

  it('writes the title as body copy, not as a heading that competes with the screen title', () => {
    const title = paneOf(<EmptyState title="Nothing here" description="Some hint" />)

    expect(title.tagName.toLowerCase()).toBe('p')
    expect(title.className).toContain('text-copy')
    expect(title.className).toContain('font-medium')
    expect(title.className).not.toContain('text-screen')
  })

  it('writes the description one step quieter than the title', () => {
    paneOf(<EmptyState title="Nothing here" description="Some hint" />)
    const description = screen.getByText('Some hint')

    expect(description.className).toContain('text-meta')
    expect(description.className).toContain('text-muted-foreground')
  })
})
