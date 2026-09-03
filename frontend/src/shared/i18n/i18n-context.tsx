import type * as React from 'react'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { ensureLocale, i18n, i18nReady, localeLoaded } from './config'
import { type Locale, resolveLocale, writeStoredLocale } from './locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale())
  const [ready, setReady] = useState(() => localeLoaded(resolveLocale()))

  useEffect(() => {
    let active = true
    void i18nReady.then(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeStoredLocale(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    if (i18n.language === locale) return
    let active = true
    void ensureLocale(locale).then(() => {
      if (active) void i18n.changeLanguage(locale)
    })
    return () => {
      active = false
    }
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  if (!ready) return null

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext value={value}>{children}</LocaleContext>
    </I18nextProvider>
  )
}

export function useLocale(): LocaleContextValue {
  const value = use(LocaleContext)
  if (!value) throw new Error('useLocale must be used within I18nProvider')
  return value
}

export { useTranslation }
