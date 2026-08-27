import { createContext, useContext } from 'react'
import { type ThemeState, useThemeState } from './use-theme-state'

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useThemeState()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme requires a ThemeProvider above it in the tree')
  return value
}
