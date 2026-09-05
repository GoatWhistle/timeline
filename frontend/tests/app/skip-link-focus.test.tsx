import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/shared/i18n/i18n-context'

const APP_SHELL = readFileSync(join(process.cwd(), 'src', 'app', 'app-shell.tsx'), 'utf8')

function SkipLinkHarness() {
  const mainRef = useRef<HTMLElement>(null)
  return (
    <I18nProvider>
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Skip to content
      </a>
      <nav>
        <a href="/catalog">Catalog</a>
      </nav>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <button type="button">First control</button>
      </main>
    </I18nProvider>
  )
}

describe('the real app shell wires the skip link to main, not just to the URL hash', () => {
  it('gives main a ref and a negative tabindex so it can be focused programmatically', () => {
    expect(APP_SHELL).toMatch(/<main[\s\S]{0,120}ref=\{mainRef\}/)
    expect(APP_SHELL).toMatch(/<main[\s\S]{0,120}tabIndex=\{-1\}/)
  })

  it('focuses that same ref from the skip link activation, not merely from a hash change', () => {
    const skipLinkIndex = APP_SHELL.indexOf('href="#main"')
    expect(skipLinkIndex).toBeGreaterThan(-1)
    const skipLinkBlock = APP_SHELL.slice(skipLinkIndex, skipLinkIndex + 200)
    expect(skipLinkBlock).toContain('mainRef.current?.focus()')
  })
})

describe('the skip link moves keyboard focus into main, not only the URL hash', () => {
  it('carries a negative tabindex on main so it can receive focus without joining tab order', () => {
    render(<SkipLinkHarness />)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('places focus on main itself after activating the skip link', async () => {
    const user = userEvent.setup()
    render(<SkipLinkHarness />)

    const skipLink = screen.getByRole('link', { name: 'Skip to content' })
    skipLink.focus()
    await user.keyboard('{Enter}')

    expect(document.activeElement).toBe(screen.getByRole('main'))
  })

  it('resumes tabbing inside main, not back at the skip link, once it has been activated', async () => {
    const user = userEvent.setup()
    render(<SkipLinkHarness />)

    const skipLink = screen.getByRole('link', { name: 'Skip to content' })
    skipLink.focus()
    await user.keyboard('{Enter}')
    await user.tab()

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First control' }))
  })
})
