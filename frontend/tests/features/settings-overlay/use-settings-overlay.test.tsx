import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useSettingsOverlay } from '@/features/settings-overlay/use-settings-overlay'

function wrapper(route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  }
}

function useProbe() {
  return { overlay: useSettingsOverlay(), location: useLocation() }
}

describe('useSettingsOverlay', () => {
  it('stays closed when the query parameter is absent', () => {
    const { result } = renderHook(() => useSettingsOverlay(), { wrapper: wrapper('/') })
    expect(result.current.open).toBe(false)
  })

  it('opens on the section named in the address', () => {
    const { result } = renderHook(() => useSettingsOverlay(), {
      wrapper: wrapper('/?settings=appearance'),
    })
    expect(result.current.open).toBe(true)
    expect(result.current.section).toBe('appearance')
  })

  it('opens on the default section for an unknown value', () => {
    const { result } = renderHook(() => useSettingsOverlay(), {
      wrapper: wrapper('/?settings=nonsense'),
    })
    expect(result.current.open).toBe(true)
    expect(result.current.section).toBe('profile')
  })

  it('writes the section into the address when opened', () => {
    const { result } = renderHook(() => useProbe(), { wrapper: wrapper('/') })
    act(() => {
      result.current.overlay.openSettings('notifications')
    })
    expect(result.current.location.search).toContain('settings=notifications')
    expect(result.current.overlay.open).toBe(true)
  })

  it('clears only the settings parameter on close', () => {
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper('/?state=ACTIVE&settings=appearance'),
    })
    act(() => {
      result.current.overlay.closeSettings()
    })
    expect(result.current.overlay.open).toBe(false)
    expect(result.current.location.search).toContain('state=ACTIVE')
    expect(result.current.location.search).not.toContain('settings=')
  })
})
