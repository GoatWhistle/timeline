import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { PalettePrefixList } from '@/features/command-palette/palette-prefix-list'
import { i18n } from '@/shared/i18n/config'

function prefixSymbols(): string[] {
  return Array.from(document.querySelectorAll('[data-palette-prefix-row]')).map(
    (row) => row.getAttribute('data-palette-prefix-row') ?? '',
  )
}

describe('the prefix help keeps administrative reach out of a member view', () => {
  it('never lists the ! prefix for an ordinary member', () => {
    renderWithProviders(<PalettePrefixList isAdmin={false} />)
    expect(prefixSymbols()).not.toContain('!')
  })

  it('never names the administrative pages for an ordinary member', () => {
    renderWithProviders(<PalettePrefixList isAdmin={false} />)
    expect(screen.queryByText(i18n.t('common:palette.help.prefixAdmin'))).not.toBeInTheDocument()
  })

  it('still lists the ! prefix for an administrator', () => {
    renderWithProviders(<PalettePrefixList isAdmin />)
    expect(prefixSymbols()).toContain('!')
    expect(screen.getByText(i18n.t('common:palette.help.prefixAdmin'))).toBeInTheDocument()
  })

  it('leaves every ordinary prefix in place for a member', () => {
    renderWithProviders(<PalettePrefixList isAdmin={false} />)
    expect(prefixSymbols()).toEqual(['#', '@', '*', '>', '/', '~'])
  })
})
