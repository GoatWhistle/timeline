import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyThemeAnimated, THEME_STORAGE_KEY } from '@/shared/theme/theme'
import { useThemeState } from '@/shared/theme/use-theme-state'

function stubMatchMedia({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark')
        ? dark
        : query.includes('prefers-reduced-motion: reduce')
          ? reduced
          : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('the theme a person picked survives a reload', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.classList.remove('dark')
    stubMatchMedia({ dark: false, reduced: false })
  })

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.classList.remove('dark')
    vi.unstubAllGlobals()
  })

  it('defaults to following the system when nothing was ever chosen', () => {
    const { result } = renderHook(() => useThemeState())
    expect(result.current.preference).toBe('system')
  })

  it('reads the stored preference on the first paint after a reload', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    const { result } = renderHook(() => useThemeState())

    expect(result.current.preference).toBe('dark')
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
  })

  it('writes the pick to storage so the next visit starts there', async () => {
    const { result } = renderHook(() => useThemeState())

    act(() => result.current.setPreference('light'))

    await waitFor(() => expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reports the system theme separately from the resolved one', () => {
    stubMatchMedia({ dark: true, reduced: false })
    localStorage.setItem(THEME_STORAGE_KEY, 'light')

    const { result } = renderHook(() => useThemeState())

    expect(result.current.resolved).toBe('light')
    expect(result.current.systemTheme).toBe('dark')
  })
})

describe('the theme switch animation obeys the motion preference', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.themeSwitching
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  it('animates the swap when motion is welcome', () => {
    stubMatchMedia({ dark: false, reduced: false })
    const start = vi.fn().mockImplementation((run: () => void) => {
      run()
      return { finished: Promise.resolve() }
    })
    Object.defineProperty(document, 'startViewTransition', {
      value: start,
      configurable: true,
      writable: true,
    })

    applyThemeAnimated('dark')

    expect(start).toHaveBeenCalledOnce()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('swaps without a transition when reduced motion is asked for', () => {
    stubMatchMedia({ dark: false, reduced: true })
    const start = vi.fn()
    Object.defineProperty(document, 'startViewTransition', {
      value: start,
      configurable: true,
      writable: true,
    })

    applyThemeAnimated('dark')

    expect(start).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
