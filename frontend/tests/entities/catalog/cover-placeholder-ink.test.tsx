import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { CatalogCover } from '@/entities/catalog/catalog-cover'
import { CoverMissing } from '@/features/event-cover/cover-missing'
import { i18n, i18nReady } from '@/shared/i18n/config'

const INK = 'text-foreground'

const FADED = 'text-muted-foreground'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

describe('a tile without a cover stays quiet', () => {
  it('says there is no cover in a soft grey, with nothing drawn around it', () => {
    const { container } = render(<CatalogCover coverUrl={null} color={{ family: 'RU', slot: 3 }} />)
    const label = screen.getByText('No cover')
    expect(label.className.split(/\s+/), 'the label shouts over the plate').toContain(FADED)
    expect(container.querySelector('svg'), 'a figure came back into the tile').toBeNull()
  })

  it('lays the label on a plain grey plate, not on the event colour', () => {
    const { container } = render(
      <CatalogCover coverUrl={null} color={{ family: 'WORLD', slot: 10 }} />,
    )
    const frame = container.querySelector('[data-catalog-cover]') as HTMLElement
    const classes = frame.className.split(/\s+/)
    expect(classes).toContain('bg-muted')
    expect(classes).not.toContain('bg-event-fill')
  })

  it('still frames the empty plate in the event colour, not in a neutral grey', () => {
    const { container } = render(
      <CatalogCover coverUrl={null} color={{ family: 'WORLD', slot: 10 }} />,
    )
    const classes = (
      container.querySelector('[data-catalog-cover]') as HTMLElement
    ).className.split(/\s+/)
    expect(classes, 'the frame went grey without a picture').toContain('after:border-event-tint/70')
    expect(classes).toContain('after:border-2')
    expect(classes).not.toContain('after:border-border')
  })

  it('keeps one 16:9 frame whether or not there is a picture, so a grid row stays even', () => {
    for (const coverUrl of [null, 'https://example.test/cover.png']) {
      const { container, unmount } = render(<CatalogCover coverUrl={coverUrl} color={null} />)
      const frame = container.querySelector('[data-catalog-cover]') as HTMLElement
      expect(frame.className.split(/\s+/), `cover ${coverUrl}`).toContain('aspect-[16/9]')
      unmount()
    }
  })
})

describe('a cover picture sits in a frame you can actually see', () => {
  it('draws a two-pixel frame in a strong share of the event colour', () => {
    const { container } = render(
      <CatalogCover coverUrl="https://example.test/cover.png" color={{ family: 'RU', slot: 3 }} />,
    )
    const classes = (
      container.querySelector('[data-catalog-cover]') as HTMLElement
    ).className.split(/\s+/)
    expect(classes, 'the frame went back to a hairline').toContain('after:border-2')
    expect(classes).toContain('after:border-event-tint/70')
  })
})

describe('the event window keeps its own missing-cover figure', () => {
  it('writes the missing-cover label in the theme ink', () => {
    const { container } = render(<CoverMissing />)
    const label = container.querySelector('p')
    expect(label).not.toBeNull()
    const classes = (label as HTMLElement).className.split(/\s+/)
    expect(classes).toContain(INK)
    expect(classes).not.toContain(FADED)
  })
})
