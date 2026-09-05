import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BottomNav } from '@/app/sidebar/bottom-nav'
import { CATALOG_NAV, MINE_NAV } from '@/app/sidebar/nav-section'
import type { MeResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import {
  BAR_INSET_BOTTOM,
  SAFE_BOTTOM,
  SAFE_SIDES,
  SAFE_TOP,
  TAP_TARGET,
} from '@/shared/ui/layout/mobile/mobile-state'

const styles = readFileSync(join(process.cwd(), 'src', 'styles', 'index.css'), 'utf8')
const tokens = readFileSync(
  join(process.cwd(), 'src', 'styles', 'tokens', 'typography.css'),
  'utf8',
)
const shell = readFileSync(join(process.cwd(), 'src', 'app', 'app-shell.tsx'), 'utf8')

function person(admin = false): MeResponse {
  return {
    id: 'usr_1',
    email: 'someone@example.com',
    first_name: 'Some',
    last_name: 'One',
    is_admin: admin,
  } as MeResponse
}

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <I18nProvider>{children}</I18nProvider>
    </ShortcutProvider>
  )
}

function Bar({ user, unread = 0 }: { user?: MeResponse; unread?: number } = {}) {
  return (
    <Harness>
      <BottomNav
        items={[...CATALOG_NAV, ...MINE_NAV]}
        user={user}
        unread={unread}
        onOpenMore={() => {}}
        moreExpanded={false}
      />
    </Harness>
  )
}

function badgeText(): string | null {
  return document.querySelector('[data-bottom-more] [data-bottom-badge]')?.textContent ?? null
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('the phone has no sidebar and nothing that opens one', () => {
  it('never mounts the sidebar pane while the phone bar is the navigation', () => {
    expect(shell).toMatch(/\{!phone && <AppSidebar/)
  })

  it('keeps the sidebar scrim off the phone, since there is no drawer to dim behind', () => {
    expect(shell).toMatch(/const drawerScrim = !phone && sidebar\.overlay && !sidebar\.collapsed/)
  })

  it('leaves no sidebar toggle in the phone bar for a thumb to find', () => {
    renderWithProviders(<Bar />)

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.querySelector('[data-sidebar-toggle]')).toBeNull()
  })

  it('opens a sheet from the bar rather than the drawer the desktop uses', () => {
    renderWithProviders(<Bar />)

    const more = document.querySelector('[data-bottom-more]') as HTMLElement
    expect(more.getAttribute('aria-haspopup')).toBe('dialog')
    expect(more.hasAttribute('data-sidebar-toggle')).toBe(false)
  })
})

describe('the phone reaches every section without opening a drawer', () => {
  it('puts each participant destination in the bar, so none costs an extra tap', () => {
    renderWithProviders(<Bar />)

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    const targets = [...bar.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    expect(targets).toEqual(['/catalog', '/schedule', '/teams', '/history'])
  })

  it('names the bar as its own landmark, distinct from the drawer', () => {
    renderWithProviders(<Bar />)

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.tagName).toBe('NAV')
    const label = bar.getAttribute('aria-label')
    expect(label).toBeTruthy()
    expect(label).not.toBe('Main navigation')
  })

  it('keeps the bar within the five-destination ceiling a thumb can hit', () => {
    renderWithProviders(<Bar />)

    const bar = document.querySelector('[data-bottom-nav]') as HTMLElement
    expect(bar.querySelectorAll('a, button').length).toBeLessThanOrEqual(5)
  })
})

describe('the last bar cell is the person, not a hamburger', () => {
  it('shows the signed-in face so the cell reads as an account, not a menu', () => {
    renderWithProviders(<Bar user={person()} />)

    const more = document.querySelector('[data-bottom-more]') as HTMLElement
    expect(more.querySelector('[data-avatar]')).not.toBeNull()
  })

  it('carries the unread count on that cell, so the badge survives without a sidebar', () => {
    renderWithProviders(<Bar user={person()} unread={7} />)

    expect(badgeText()).toBe('7')
  })

  it('caps the drawn badge instead of stretching the cell', () => {
    renderWithProviders(<Bar user={person()} unread={140} />)

    expect(badgeText()).toBe('9+')
  })

  it('still tells a screen reader the true count the badge had to shorten', () => {
    renderWithProviders(<Bar user={person()} unread={140} />)

    const more = document.querySelector('[data-bottom-more]') as HTMLElement
    expect(more.textContent).toContain('140')
  })

  it('draws no badge at all when there is nothing unread', () => {
    renderWithProviders(<Bar user={person()} unread={0} />)

    expect(badgeText()).toBeNull()
    const more = document.querySelector('[data-bottom-more]') as HTMLElement
    expect(more.textContent).not.toMatch(/\d/)
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
    renderWithProviders(<Bar />)

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
    renderWithProviders(<Bar user={person()} />)

    const cells = document.querySelectorAll('[data-bottom-nav] a, [data-bottom-nav] button')
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.className).toContain('min-h-tap')
      expect(cell.className).toContain('min-w-tap')
    }
  })
})
