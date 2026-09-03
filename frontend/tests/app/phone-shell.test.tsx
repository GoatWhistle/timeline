import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppSidebar } from '@/app/sidebar/app-sidebar'
import { BottomNav } from '@/app/sidebar/bottom-nav'
import { CATALOG_NAV, MINE_NAV } from '@/app/sidebar/nav-section'
import type { MeResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import {
  BAR_INSET_BOTTOM,
  PHONE_MAX_WIDTH,
  PHONE_QUERY,
  SAFE_BOTTOM,
  SAFE_SIDES,
  SAFE_TOP,
  TAP_TARGET,
} from '@/shared/ui/layout/mobile/mobile-state'
import { OVERLAY_QUERY } from '@/shared/ui/layout/sidebar/sidebar-state'
import { useSidebar } from '@/shared/ui/layout/sidebar/use-sidebar'

const styles = readFileSync(join(process.cwd(), 'src', 'styles', 'index.css'), 'utf8')
const tokens = readFileSync(
  join(process.cwd(), 'src', 'styles', 'tokens', 'typography.css'),
  'utf8',
)

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
    const narrow = (query === PHONE_QUERY || query === OVERLAY_QUERY) && width < PHONE_MAX_WIDTH
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

function Bar() {
  return (
    <BottomNav items={[...CATALOG_NAV, ...MINE_NAV]} onOpenMore={() => {}} moreExpanded={false} />
  )
}

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <I18nProvider>{children}</I18nProvider>
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

describe('the phone reaches every section without opening a drawer', () => {
  it('puts each participant destination in the bar, so none costs an extra tap', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    const targets = [...bar.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    expect(targets).toEqual(['/catalog', '/schedule', '/teams', '/history'])
  })

  it('names the bar as its own landmark, distinct from the drawer', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.tagName).toBe('NAV')
    const label = bar.getAttribute('aria-label')
    expect(label).toBeTruthy()
    expect(label).not.toBe('Main navigation')
  })

  it('keeps the bar within the five-destination ceiling a thumb can hit', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.querySelectorAll('a, button').length).toBeLessThanOrEqual(5)
  })

  it('offers the drawer from the bar and says whether it is open', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const more = document.querySelector('[data-bottom-more]') as HTMLElement
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(more.hasAttribute('data-sidebar-toggle')).toBe(true)
  })
})

describe('the phone drawer stops repeating what the bar already shows', () => {
  it('drops the four bar destinations from the drawer on a phone', async () => {
    setViewport(390)

    function Pane() {
      const sidebar = useSidebar()
      return <AppSidebar user={person()} isAdmin={false} sidebar={sidebar} phone />
    }

    renderWithProviders(
      <Harness>
        <Pane />
      </Harness>,
    )

    const pane = document.querySelector('aside') as HTMLElement
    await waitFor(() => expect(pane.dataset.sidebarOverlay).toBe('true'))
    const hrefs = [...pane.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))
    expect(hrefs).not.toContain('/teams')
    expect(hrefs).not.toContain('/history')
  })

  it('still lists them in the drawer on a desktop, where there is no bar', async () => {
    setViewport(1440)

    function Pane() {
      const sidebar = useSidebar()
      return <AppSidebar user={person()} isAdmin={false} sidebar={sidebar} />
    }

    renderWithProviders(
      <Harness>
        <Pane />
      </Harness>,
    )

    const pane = document.querySelector('aside') as HTMLElement
    const hrefs = [...pane.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/teams')
    expect(hrefs).toContain('/history')
  })
})

describe('fixed chrome keeps clear of the notch and the home indicator', () => {
  it('defines every inset from the device, not from a guessed constant', () => {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      expect(tokens).toMatch(new RegExp(`--safe-${side}:\\s*env\\(safe-area-inset-${side}`))
    }
  })

  it('ships a utility for each inset so no screen invents its own spelling', () => {
    expect(styles).toMatch(/@utility safe-pt \{\s*padding-top: var\(--safe-top\)/)
    expect(styles).toMatch(/@utility safe-pb \{\s*padding-bottom: var\(--safe-bottom\)/)
    expect(styles).toMatch(/@utility safe-px \{/)
    expect(styles).toMatch(/@utility safe-inset-b \{/)
  })

  it('pads the bar below itself so labels clear the home indicator', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.className).toContain(SAFE_BOTTOM)
    expect(bar.className).toContain(SAFE_SIDES)
  })

  it('reserves the bar height under the content so the list is never hidden', () => {
    expect(styles).toMatch(
      /@utility safe-inset-b \{\s*padding-bottom: calc\(var\(--bar-bottom\) \+ var\(--safe-bottom\)\)/,
    )
    expect(BAR_INSET_BOTTOM).toBe('safe-inset-b')
  })

  it('keeps the named inset helpers pointing at the utilities they promise', () => {
    expect(SAFE_TOP).toBe('safe-pt')
    expect(SAFE_BOTTOM).toBe('safe-pb')
    expect(SAFE_SIDES).toBe('safe-px')
  })
})

describe('a finger gets a target it can actually hit', () => {
  it('sizes the tap helper to the 44px floor a thumb needs', () => {
    expect(tokens).toMatch(/--tap-target:\s*44px/)
    expect(TAP_TARGET).toBe('min-h-tap min-w-tap')
  })

  it('gives every bar destination that floor, not the desktop row height', () => {
    renderWithProviders(
      <Harness>
        <Bar />
      </Harness>,
    )

    const cells = document.querySelectorAll('[data-bottom-nav] a, [data-bottom-nav] button')
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.className).toContain('min-h-tap')
      expect(cell.className).toContain('min-w-tap')
    }
  })
})
