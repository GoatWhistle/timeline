import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { PublicShell } from '@/app/public-shell'
import { I18nProvider } from '@/shared/i18n/i18n-context'

function renderShell() {
  return renderWithProviders(
    <I18nProvider>
      <PublicShell />
    </I18nProvider>,
  )
}

describe('the public shell greets a guest reading a profile', () => {
  it('names the product and offers a way in', () => {
    renderShell()
    expect(screen.getByRole('link', { name: /timeline/i })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('carries the language switch, same as the sign-in door', () => {
    renderShell()
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
  })
})

describe('the public shell hands its height down, so a page can centre in it', () => {
  it('makes the shell a full-height column', () => {
    const { container } = renderShell()
    const shell = container.firstElementChild as HTMLElement
    expect(shell.className).toContain('min-h-screen')
    expect(shell.className).toContain('flex')
    expect(shell.className).toContain('flex-col')
  })

  it('lets the content area take the space the header leaves', () => {
    renderShell()
    const main = document.querySelector('main') as HTMLElement
    expect(main.className).toContain('flex-1')
    expect(main.className).toContain('flex')
    expect(main.className).toContain('flex-col')
  })

  it('keeps the header from being squeezed by that content', () => {
    renderShell()
    const header = document.querySelector('header') as HTMLElement
    expect(header.className).toContain('shrink-0')
  })
})
