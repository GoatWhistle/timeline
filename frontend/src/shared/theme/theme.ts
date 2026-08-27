export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export type ResolvedTheme = 'light' | 'dark'

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export const THEME_STORAGE_KEY = 'timeline-theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
}

export function readStoredTheme(): ThemePreference | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeStoredTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    return
  }
}

export function systemTheme(): ResolvedTheme {
  return typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference
}

export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

export function watchSystemTheme(onChange: (resolved: ResolvedTheme) => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined
  const query = matchMedia(DARK_QUERY)
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
