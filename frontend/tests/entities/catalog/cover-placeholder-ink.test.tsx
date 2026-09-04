import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogCover } from '@/entities/catalog/catalog-cover'
import { CoverMissing } from '@/features/event-cover/cover-missing'

const INK = 'text-foreground'

const TINTED = 'text-event-tint'

const FADED = 'text-muted-foreground'

describe('a cover placeholder is written in ink the tint cannot swallow', () => {
  it('writes the catalog initial in the theme ink rather than the slot colour', () => {
    render(<CatalogCover coverUrl={null} color={{ family: 'RU', slot: 3 }} initial="A" />)
    const initial = screen.getByText('A')
    const classes = initial.className.split(/\s+/)
    expect(classes).toContain(INK)
    expect(classes).not.toContain(TINTED)
    expect(classes).not.toContain(FADED)
  })

  it('keeps the catalog initial in ink for every slot of every family', () => {
    for (const family of ['RU', 'WORLD'] as const) {
      for (const slot of [0, 7, 12, 23]) {
        const { unmount } = render(
          <CatalogCover coverUrl={null} color={{ family, slot }} initial="Z" />,
        )
        const classes = screen.getByText('Z').className.split(/\s+/)
        expect(classes, `${family} slot ${slot}`).toContain(INK)
        expect(classes, `${family} slot ${slot}`).not.toContain(TINTED)
        unmount()
      }
    }
  })

  it('writes the missing-cover label in the theme ink', () => {
    const { container } = render(<CoverMissing />)
    const label = container.querySelector('p')
    expect(label).not.toBeNull()
    const classes = (label as HTMLElement).className.split(/\s+/)
    expect(classes).toContain(INK)
    expect(classes).not.toContain(FADED)
  })

  it('still carries the slot colour on the fill behind the initial', () => {
    const { container } = render(
      <CatalogCover coverUrl={null} color={{ family: 'WORLD', slot: 10 }} initial="B" />,
    )
    const tinted = container.querySelector('[data-event-family="WORLD"][data-event-slot="10"]')
    expect(tinted).not.toBeNull()
    expect(screen.getByText('B').closest('span')?.parentElement?.className).toContain(
      'bg-event-fill-strong',
    )
  })
})
