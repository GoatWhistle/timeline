import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PhoneMoreSheet } from '@/app/sidebar/phone-more-sheet'
import type { MeResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { SAFE_BOTTOM } from '@/shared/ui/layout/mobile/mobile-state'

function person(admin = false): MeResponse {
  return {
    id: 'usr_1',
    email: 'someone@example.com',
    first_name: 'Some',
    last_name: 'One',
    is_admin: admin,
  } as MeResponse
}

function Sheet({
  admin = false,
  inAdmin = false,
  user = person(admin),
}: {
  admin?: boolean
  inAdmin?: boolean
  user?: MeResponse | undefined
} = {}) {
  return (
    <ShortcutProvider>
      <I18nProvider>
        <PhoneMoreSheet
          user={user}
          isAdmin={admin}
          inAdmin={inAdmin}
          open
          onOpenChange={() => {}}
        />
      </I18nProvider>
    </ShortcutProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('the sheet keeps everything the phone drawer used to carry', () => {
  it('shows who is signed in, by name and by address', () => {
    renderWithProviders(<Sheet />)

    const profile = document.querySelector('[data-phone-profile]') as HTMLElement
    expect(profile.textContent).toContain('someone@example.com')
  })

  it('offers the administrator the way into administration', () => {
    renderWithProviders(<Sheet admin />)

    const link = document.querySelector('[data-phone-panel-switch]') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/admin/events')
  })

  it('offers the way back to the participant view once inside administration', () => {
    renderWithProviders(<Sheet admin inAdmin />)

    const link = document.querySelector('[data-phone-panel-switch]') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/catalog')
  })

  it('lists every administration section, which the bar has no room for', () => {
    renderWithProviders(<Sheet admin inAdmin />)

    const sheet = document.querySelector('[data-phone-more-sheet]') as HTMLElement
    const hrefs = [...sheet.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    for (const path of ['/admin/events', '/admin/users', '/admin/audit']) {
      expect(hrefs).toContain(path)
    }
  })

  it('hides administration from someone who is not an administrator', () => {
    renderWithProviders(<Sheet />)

    expect(document.querySelector('[data-phone-panel-switch]')).toBeNull()
  })

  it('keeps a way out of the session', () => {
    renderWithProviders(<Sheet />)

    expect(document.querySelector('[data-phone-logout]')).not.toBeNull()
  })

  it('names itself for a screen reader even though the title is not drawn', () => {
    renderWithProviders(<Sheet />)

    const sheet = document.querySelector('[data-phone-more-sheet]') as HTMLElement
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(screen.getByRole('dialog').textContent).toBeTruthy()
  })

  it('rises from the bottom edge, where a thumb rests, not from the middle', () => {
    renderWithProviders(<Sheet />)

    const sheet = document.querySelector('[data-phone-more-sheet]') as HTMLElement
    expect(sheet.className).toContain('bottom-0')
    expect(sheet.className).toContain('top-auto')
    expect(sheet.className).toContain(SAFE_BOTTOM)
  })
})

describe('a finger gets a sheet row it can actually hit', () => {
  it('gives every sheet control the floor, by height or by the shared reach helper', async () => {
    renderWithProviders(<Sheet admin inAdmin />)

    const sheet = document.querySelector('[data-phone-more-sheet]') as HTMLElement
    const rows = sheet.querySelectorAll('a, button')
    await waitFor(() => expect(rows.length).toBeGreaterThan(6))
    for (const row of rows) {
      const reaches =
        row.className.includes('min-h-tap') ||
        row.className.includes('pointer-coarse:after:min-h-11')
      expect(reaches, row.className).toBe(true)
    }
  })

  it('gives every row the sheet owns that floor by height, not by the helper alone', async () => {
    renderWithProviders(<Sheet admin inAdmin />)

    const sheet = document.querySelector('[data-phone-more-sheet]') as HTMLElement
    const rows = sheet.querySelectorAll('[data-phone-profile], [data-phone-logout], nav a')
    await waitFor(() => expect(rows.length).toBeGreaterThan(5))
    for (const row of rows) {
      expect(row.className, row.outerHTML.slice(0, 80)).toContain('min-h-tap')
    }
  })
})
