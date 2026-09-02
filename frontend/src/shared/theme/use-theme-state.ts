import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyTheme,
  applyThemeAnimated,
  DEFAULT_THEME_PREFERENCE,
  type ResolvedTheme,
  readStoredTheme,
  resolveTheme,
  systemTheme,
  type ThemePreference,
  watchSystemTheme,
  writeStoredTheme,
} from './theme'

export type ThemeState = {
  preference: ThemePreference
  resolved: ResolvedTheme
  systemTheme: ResolvedTheme
  setPreference: (next: ThemePreference) => void
}

export function useThemeState(): ThemeState {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => readStoredTheme() ?? DEFAULT_THEME_PREFERENCE,
  )
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference))
  const [system, setSystem] = useState<ResolvedTheme>(() => systemTheme())
  const mounted = useRef(false)

  useEffect(() => {
    const next = resolveTheme(preference)
    setResolved(next)
    if (mounted.current) applyThemeAnimated(next)
    else applyTheme(next)
    mounted.current = true
  }, [preference])

  useEffect(
    () =>
      watchSystemTheme((next) => {
        setSystem(next)
        if (preference !== 'system') return
        setResolved(next)
        applyThemeAnimated(next)
      }),
    [preference],
  )

  const setPreference = useCallback((next: ThemePreference) => {
    writeStoredTheme(next)
    setPreferenceState(next)
  }, [])

  return { preference, resolved, systemTheme: system, setPreference }
}
