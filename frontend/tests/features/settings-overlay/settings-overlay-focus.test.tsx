import { useQueryClient } from '@tanstack/react-query'
import { renderWithProviders } from '@tests/support/render'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
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

describe('opening settings puts the keyboard inside the dialog', () => {
  it('moves focus into the panel on a phone opened straight at a section', async () => {
    useViewport(true)
    await renderOverlay('/?settings=profile')

    const panel = overlay()
    expect(panel).not.toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(panel?.contains(document.activeElement)).toBe(true)
  })

  it('moves focus onto the active rail item on a wide viewport', async () => {
    useViewport(false)
    await renderOverlay('/?settings=profile')

    const panel = overlay()
    expect(panel?.contains(document.activeElement)).toBe(true)
  })

  it('moves focus into the index when a phone opens the section list', async () => {
    useViewport(true)
    await renderOverlay('/?settings=')

    const panel = overlay()
    expect(document.activeElement).not.toBe(document.body)
    expect(panel?.contains(document.activeElement)).toBe(true)
  })
})
