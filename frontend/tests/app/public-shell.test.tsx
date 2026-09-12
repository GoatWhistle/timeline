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
