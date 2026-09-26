import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CatalogViewSwitch } from '@/features/catalog/catalog-view-switch'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const tokens = (element: Element | null) => element?.getAttribute('class')?.split(/\s+/) ?? []

describe('switching between table and tiles moves rather than blinks', () => {
  it('slides one shared highlight under the chosen view instead of painting each button', () => {
    render(<CatalogViewSwitch layout="grid" onLayout={vi.fn()} />)
    const strip = document.querySelector('[data-view-switch]') as HTMLElement
    expect(
      strip.querySelector('[data-indicator]'),
      'the highlight no longer travels',
    ).not.toBeNull()
    const tiles = screen.getByRole('button', { name: 'Tiles' })
    expect(tiles.getAttribute('data-indicator-active')).toBe('true')
    expect(tokens(tiles), 'the button paints its own background again').not.toContain(
      'bg-accent-surface',
    )
  })

  it('settles the chosen icon and tips the other aside, only when motion is welcome', () => {
    render(<CatalogViewSwitch layout="table" onLayout={vi.fn()} />)
    const chosen = screen.getByRole('button', { name: 'Table' }).querySelector('svg')
    const other = screen.getByRole('button', { name: 'Tiles' }).querySelector('svg')
    expect(tokens(chosen)).toContain('scale-100')
    expect(tokens(other)).toContain('scale-85')
    for (const icon of [chosen, other]) {
      expect(tokens(icon)).toContain('motion-safe:transition-[scale,rotate]')
    }
  })

  it('keeps room for the scrollbar in a list pane, so the bar does not jump when tiles overflow', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/shared/ui/layout/three-pane/three-pane.tsx'),
      'utf8',
    )
    expect(source).toContain('[scrollbar-gutter:stable]')
  })
})
