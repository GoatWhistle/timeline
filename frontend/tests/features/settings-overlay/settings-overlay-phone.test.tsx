import { useQueryClient } from '@tanstack/react-query'
import { renderWithProviders } from '@tests/support/render'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS } from '@/features/settings-overlay/sections'
import { SettingsOverlay } from '@/features/settings-overlay/settings-overlay'
import { sessionQueryKey } from '@/shared/api/session'
import type { MeResponse } from '@/shared/api/types.gen'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { PHONE_QUERY } from '@/shared/ui/layout/mobile/mobile-state'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

const USER: MeResponse = {
  id: '4b7a7cf5-3f45-4b7e-a3d9-9f27b8a1c2d3',
  email: 'member@example.com',
  email_verified: true,
  first_name: 'Ivan',
  last_name: 'Petrov',
  display_name: 'Petrov Ivan',
  profile_public: false,
  profile_visibility: 'private',
  pinned_event_ids: [],
  theme: 'system',
  is_active: true,
  is_admin: false,
  locale: 'en',
  telegram_linked: false,
  notification_channels: ['TELEGRAM', 'EMAIL'],
  shortcuts: {},
  timezone: 'Europe/Moscow',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
}

const original = window.matchMedia

function useViewport(phone: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query === PHONE_QUERY && phone,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function Seed({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  client.setQueryData(sessionQueryKey, USER)
  return <>{children}</>
}

function renderOverlay(route: string) {
  return renderWithProviders(
    <Seed>
      <ShortcutProvider>
        <TooltipProvider>
          <SettingsOverlay />
        </TooltipProvider>
      </ShortcutProvider>
    </Seed>,
    { route },
  )
}

const overlay = () => document.querySelector('[data-settings-overlay]')

afterEach(() => {
  window.matchMedia = original
})

describe('settings drop the side rail on a phone the way the app shell does', () => {
  it('mounts no navigation rail beside the content on a phone', async () => {
    useViewport(true)
    await renderOverlay('/?settings=profile')

    expect(overlay()).not.toBeNull()
    expect(document.querySelector('[data-settings-rail]')).toBeNull()
  })

  it('keeps the rail on a wider viewport, where it fits', async () => {
    useViewport(false)
    await renderOverlay('/?settings=profile')

    expect(document.querySelector('[data-settings-rail]')).not.toBeNull()
  })

  it('shows the sections as a full-width index a phone can drill into', async () => {
    useViewport(true)
    await renderOverlay('/?settings=')

    const index = document.querySelector('[data-settings-index]')
    expect(index).not.toBeNull()
    expect(index?.querySelectorAll('[data-settings-index-item]').length).toBe(
      SETTINGS_SECTIONS.length,
    )
  })

  it('offers a way back to the index from a section on a phone', async () => {
    useViewport(true)
    await renderOverlay('/?settings=account')

    expect(document.querySelector('[data-settings-back]')).not.toBeNull()
  })

  it('offers no back control on a wider viewport, where the rail already shows the sections', async () => {
    useViewport(false)
    await renderOverlay('/?settings=account')

    expect(document.querySelector('[data-settings-back]')).toBeNull()
  })

  it('fills the screen on a phone instead of floating as an inset panel', async () => {
    useViewport(true)
    await renderOverlay('/?settings=profile')

    const classes = overlay()?.className ?? ''
    expect(classes).toContain('inset-0')
    expect(classes).not.toContain('w-[min(92vw,64rem)]')
  })

  it('keeps every section reachable from the phone index', async () => {
    useViewport(true)
    await renderOverlay('/?settings=')

    const ids = [...document.querySelectorAll('[data-settings-index-item]')].map(
      (item) => (item as HTMLElement).dataset.settingsIndexItem,
    )
    expect(ids).toEqual([
      'profile',
      'account',
      'appearance',
      'notifications',
      'shortcuts',
      'sessions',
    ])
  })
})
