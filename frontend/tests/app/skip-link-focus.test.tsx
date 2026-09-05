import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '@/shared/i18n/i18n-context'

const APP_SHELL = readFileSync(join(process.cwd(), 'src', 'app', 'app-shell.tsx'), 'utf8')

function SkipLinkHarness() {
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function focusMain() {
      mainRef.current?.focus()
    }
    function onClick(event: MouseEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('a[href="#main"]')) focusMain()
    }
    function onHashChange() {
      if (window.location.hash === '#main') focusMain()
    }
    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  return (
    <I18nProvider>
      <a href="#main">Skip to content</a>
      <nav>
        <a href="/catalog">Catalog</a>
      </nav>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <button type="button">First control</button>
      </main>
    </I18nProvider>
  )
}

afterEach(() => {
  window.location.hash = ''
})

describe('the real app shell wires the skip link to main, not just to the URL hash', () => {
  it('gives main a ref and a negative tabindex so it can be focused programmatically', () => {
    expect(APP_SHELL).toMatch(/<main[\s\S]{0,120}ref=\{mainRef\}/)
    expect(APP_SHELL).toMatch(/<main[\s\S]{0,120}tabIndex=\{-1\}/)
  })

  it('focuses main from a click on the skip link, so a repeat click on an unchanged hash still works', () => {
    const clickHandlerIndex = APP_SHELL.indexOf('a[href="#main"]')
    expect(clickHandlerIndex).toBeGreaterThan(-1)
    const block = APP_SHELL.slice(Math.max(0, clickHandlerIndex - 200), clickHandlerIndex + 60)
    expect(block).toContain('focusMain()')
  })

  it('also listens for the hash landing on #main, not the click alone', () => {
    const hashEffectIndex = APP_SHELL.indexOf("window.location.hash === '#main'")
    expect(hashEffectIndex).toBeGreaterThan(-1)
    const block = APP_SHELL.slice(hashEffectIndex, hashEffectIndex + 60)
    expect(block).toContain('focusMain()')
  })

  it('never reintroduces preventDefault on the skip link, which anchors should not carry', () => {
    const skipLinkIndex = APP_SHELL.indexOf('href="#main"')
    expect(skipLinkIndex).toBeGreaterThan(-1)
    const skipLinkBlock = APP_SHELL.slice(skipLinkIndex, skipLinkIndex + 120)
    expect(skipLinkBlock).not.toContain('onClick')
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

  it('moves focus again on a second activation, even though the hash does not change the second time', async () => {
    const user = userEvent.setup()
    render(<SkipLinkHarness />)

    const skipLink = screen.getByRole('link', { name: 'Skip to content' })
    const main = screen.getByRole('main')

    skipLink.focus()
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(main)

    skipLink.focus()
    expect(document.activeElement).toBe(skipLink)
    await user.keyboard('{Enter}')

    expect(document.activeElement).toBe(main)
  })
})
