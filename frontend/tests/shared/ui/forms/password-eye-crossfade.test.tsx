import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from '@/shared/ui/forms/password-input'

function eyes() {
  return [...document.querySelectorAll('[data-eye] svg')].map(
    (svg) => svg.getAttribute('class') ?? '',
  )
}

describe('the password eye blinks instead of being swapped for another glyph', () => {
  it('keeps both glyphs mounted and hands visibility from one to the other', async () => {
    const { user } = renderWithProviders(<PasswordInput aria-label="Password" />)
    const shut = eyes()
    expect(shut, 'the second eye is only created on the first press').toHaveLength(2)
    expect(shut[0]).toContain('opacity-100')
    expect(shut[1]).toContain('opacity-0')

    await user.click(screen.getByRole('button', { pressed: false }))
    const open = eyes()
    expect(open).toHaveLength(2)
    expect(open[0]).toContain('opacity-0')
    expect(open[1]).toContain('opacity-100')
  })

  it('moves the glyphs only for readers who welcome motion', () => {
    renderWithProviders(<PasswordInput aria-label="Password" />)
    for (const glyph of eyes()) {
      expect(glyph).toContain('motion-safe:transition-[opacity,scale]')
    }
  })
})
