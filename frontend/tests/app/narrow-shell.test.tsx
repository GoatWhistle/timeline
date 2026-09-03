import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppSidebar } from '@/app/sidebar/app-sidebar'
import type { MeResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { OVERLAY_MAX_WIDTH, OVERLAY_QUERY } from '@/shared/ui/layout/sidebar/sidebar-state'
import { useSidebar } from '@/shared/ui/layout/sidebar/use-sidebar'

const reset = readFileSync(join(process.cwd(), 'src', 'styles', 'reset.css'), 'utf8')

function person(): MeResponse {
  return {
    id: 'usr_1',
    email: 'someone@example.com',
    first_name: 'Some',
    last_name: 'One',
    is_admin: false,
  } as MeResponse
}

function setViewport(width: number) {
  window.matchMedia = ((query: string) => {
    const narrow = query === OVERLAY_QUERY && width < OVERLAY_MAX_WIDTH
    return {
      matches: narrow,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  }) as typeof window.matchMedia
}

function Pane() {
  const sidebar = useSidebar()
  return (
    <>
      <AppSidebar user={person()} isAdmin={false} sidebar={sidebar} />
      <button type="button" data-sidebar-toggle onClick={sidebar.toggle}>
        open nav
      </button>
    </>
  )
}

function Harness() {
  return (
    <ShortcutProvider>
      <I18nProvider>
        <Pane />
      </I18nProvider>
    </ShortcutProvider>
  )
}

const original = window.matchMedia

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  window.matchMedia = original
  localStorage.clear()
})

describe('the shell survives a phone-width viewport', () => {
  it('never pins the page to a desktop width, which forced horizontal overflow', () => {
    expect(reset).not.toMatch(/min-width:\s*\d+px/)
  })

  it('lifts the sidebar out of the row at narrow widths so main keeps the whole viewport', async () => {
    setViewport(390)
    renderWithProviders(<Harness />)

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebarOverlay).toBe('true'))
    expect(pane.className).toContain('fixed')
    expect(pane.className).toContain('translate-x-[calc(var(--pane-sidebar)*-1)]')
  })

  it('leaves the sidebar in the row at desktop widths, where it never overflowed', async () => {
    setViewport(1440)
    renderWithProviders(<Harness />)

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebarOverlay).toBeUndefined())
    expect(pane.className).not.toContain('fixed')
  })

  it('starts closed on a phone even when the desktop preference says expanded', async () => {
    setViewport(390)
    renderWithProviders(<Harness />)

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebar).toBe('hidden'))
  })

  it('opens the drawer, moves focus into it, and gives focus back when Escape closes it', async () => {
    setViewport(390)
    const { user } = renderWithProviders(<Harness />)

    const opener = screen.getByRole('button', { name: 'open nav' })
    opener.focus()
    await user.click(opener)

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebar).toBe('expanded'))
    await waitFor(() => expect(pane.contains(document.activeElement)).toBe(true))

    await user.keyboard('{Escape}')

    await waitFor(() => expect(pane.dataset.sidebar).toBe('hidden'))
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('keeps the phone drawer out of the stored desktop preference', async () => {
    setViewport(390)
    const { user } = renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'open nav' }))

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebar).toBe('expanded'))
    expect(localStorage.getItem('timeline-sidebar-collapsed')).toBeNull()
  })
})
