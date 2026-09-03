import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { AppSidebar } from '@/app/sidebar/app-sidebar'
import { ADMIN_NAV, CATALOG_NAV, MINE_NAV } from '@/app/sidebar/nav-section'
import type { MeResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import type { SidebarState } from '@/shared/ui/layout/sidebar/use-sidebar'

const SIDEBAR: SidebarState = {
  collapsed: false,
  visibility: 'expanded',
  toggle: () => {},
}

function user(isAdmin: boolean): MeResponse {
  return {
    id: 'usr_1',
    email: 'someone@example.com',
    first_name: 'Some',
    last_name: 'One',
    is_admin: isAdmin,
  } as MeResponse
}

function mount(isAdmin: boolean, route: string) {
  return renderWithProviders(
    <I18nProvider>
      <AppSidebar user={user(isAdmin)} isAdmin={isAdmin} sidebar={SIDEBAR} />
    </I18nProvider>,
    { route },
  )
}

function destinations(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href !== '')
}

describe('the administrative sidebar belongs to administrators', () => {
  it('gives a participant standing on an admin route the participant navigation', () => {
    mount(false, '/admin/users')

    const admin = destinations().filter((href) => href.startsWith('/admin'))
    expect(admin).toEqual([])
  })

  it('offers a participant no dead end it cannot walk back from', () => {
    mount(false, '/admin/ops')

    const links = destinations()
    for (const item of ADMIN_NAV) {
      expect(links, `${item.to} is a dead end a participant can still click`).not.toContain(item.to)
    }
    expect(links).toEqual(
      expect.arrayContaining([...CATALOG_NAV, ...MINE_NAV].map((item) => item.to)),
    )
  })

  it('still gives an administrator standing on an admin route the admin navigation', () => {
    mount(true, '/admin/users')

    expect(destinations()).toEqual(expect.arrayContaining(ADMIN_NAV.map((item) => item.to)))
  })

  it('still gives an administrator standing outside admin the participant navigation', () => {
    mount(true, '/schedule')

    const links = destinations()
    expect(links).toEqual(
      expect.arrayContaining([...CATALOG_NAV, ...MINE_NAV].map((item) => item.to)),
    )
    expect(links.filter((href) => href.startsWith('/admin/'))).toEqual(['/admin/events'])
  })

  it('shows a participant no way into the administrative panel at all', () => {
    mount(false, '/schedule')
    expect(destinations().filter((href) => href.startsWith('/admin'))).toEqual([])
  })
})
