import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  DEFAULT_THEME_PREFERENCE,
  type ResolvedTheme,
  readStoredTheme,
  resolveTheme,
  type ThemePreference,
  watchSystemTheme,
  writeStoredTheme,
} from './theme'

export type ThemeState = {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (next: ThemePreference) => void
}

export function useThemeState(): ThemeState {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => readStoredTheme() ?? DEFAULT_THEME_PREFERENCE,
  )
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference))

  useEffect(() => {
    const next = resolveTheme(preference)
    setResolved(next)
    applyTheme(next)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return
    return watchSystemTheme((next) => {
      setResolved(next)
      applyTheme(next)
    })
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    writeStoredTheme(next)
    setPreferenceState(next)
  }, [])

  return { preference, resolved, setPreference }
}
