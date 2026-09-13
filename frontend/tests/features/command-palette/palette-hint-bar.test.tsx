import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { PaletteHintBar } from '@/features/command-palette/palette-hint-bar'
import { i18n } from '@/shared/i18n/config'

function hintKeys(): { symbol: string; active: boolean }[] {
  const bar = document.querySelector('[data-palette-hints]')
  if (bar === null) return []
  return Array.from(bar.querySelectorAll('[data-palette-hint-key]')).map((key) => ({
    symbol: key.getAttribute('data-palette-hint-key') ?? '',
    active: key.getAttribute('data-active') === 'true',
  }))
}

describe('the palette says what each prefix does without being asked', () => {
  it('shows the prefixes and their meaning as soon as the palette opens', () => {
    renderWithProviders(<PaletteHintBar mode="smart" isAdmin />)

    expect(hintKeys().map((hint) => hint.symbol)).toEqual(['#', '@', '>', '/', '~'])
    expect(screen.getByText(i18n.t('common:palette.help.labelHackathons'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('common:palette.help.labelCommands'))).toBeInTheDocument()
  })

  it('marks nothing active while the query carries no prefix', () => {
    renderWithProviders(<PaletteHintBar mode="smart" isAdmin />)
    expect(hintKeys().filter((hint) => hint.active)).toEqual([])
  })

  it('marks the prefix in use, so the mode is visible at a glance', () => {
    renderWithProviders(<PaletteHintBar mode="hackathons" isAdmin />)

    const active = hintKeys().filter((hint) => hint.active)
    expect(active).toHaveLength(1)
    expect(active[0]?.symbol).toBe('#')
  })

  it('brings a rarely used prefix into the row when it is the one in use', () => {
    renderWithProviders(<PaletteHintBar mode="admin" isAdmin />)

    const symbols = hintKeys().map((hint) => hint.symbol)
    expect(symbols).toContain('!')
    expect(hintKeys().find((hint) => hint.symbol === '!')?.active).toBe(true)
  })

  it('keeps the row the same length whichever prefix is active', () => {
    const { unmount } = renderWithProviders(<PaletteHintBar mode="smart" isAdmin />)
    const bare = hintKeys().length
    unmount()

    renderWithProviders(<PaletteHintBar mode="events" isAdmin />)
    expect(hintKeys()).toHaveLength(bare)
  })

  it('still points at the question mark for the full list', () => {
    renderWithProviders(<PaletteHintBar mode="smart" isAdmin />)
    expect(screen.getByText(i18n.t('common:palette.help.more'))).toBeInTheDocument()
  })
})

describe('the admin prefix stays out of sight for people who cannot use it', () => {
  it('never offers ! to an ordinary member', () => {
    renderWithProviders(<PaletteHintBar mode="admin" isAdmin={false} />)
    expect(hintKeys().map((hint) => hint.symbol)).not.toContain('!')
  })

  it('still offers ! to an administrator using it', () => {
    renderWithProviders(<PaletteHintBar mode="admin" isAdmin />)
    expect(hintKeys().map((hint) => hint.symbol)).toContain('!')
  })
})
