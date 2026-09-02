import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LOCALES, type Locale, resolveLocale } from './locale'

export const NAMESPACES = [
  'common',
  'event',
  'registration',
  'notification',
  'auth',
  'errors',
  'ops',
  'team',
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const BUNDLES: Record<Namespace, readonly string[]> = {
  common: ['shell', 'action', 'format', 'admin', 'account', 'schedule'],
  event: ['event', 'event-form', 'event-list', 'event-card', 'event-personal', 'event-schedule'],
  registration: ['registration'],
  notification: ['notification'],
  auth: ['auth'],
  errors: ['errors'],
  ops: ['ops'],
  team: ['team'],
}

const modules = import.meta.glob('./locales/*/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<Record<string, unknown>>
>

const pending = new Map<Locale, Promise<void>>()

function fetchLocale(locale: Locale): Promise<void> {
  const jobs: Promise<void>[] = []
  for (const namespace of NAMESPACES) {
    for (const file of BUNDLES[namespace]) {
      const loader = modules[`./locales/${locale}/${file}.json`]
      if (!loader) continue
      jobs.push(
        loader().then((tree) => {
          i18n.addResourceBundle(locale, namespace, tree, true, true)
        }),
      )
    }
  }
  return Promise.all(jobs).then(() => undefined)
}

export function loadLocale(locale: Locale): Promise<void> {
  const existing = pending.get(locale)
  if (existing) return existing
  const job = fetchLocale(locale)
  pending.set(locale, job)
  return job
}

const initialLocale = resolveLocale()

export const i18nReady: Promise<void> = (
  i18n.isInitialized
    ? Promise.resolve()
    : i18n
        .use(initReactI18next)
        .init({
          resources: {},
          lng: initialLocale,
          fallbackLng: false,
          supportedLngs: LOCALES,
          defaultNS: 'common',
          ns: NAMESPACES,
          interpolation: { escapeValue: false },
          returnNull: false,
          partialBundledLanguages: true,
        })
        .then(() => undefined)
).then(() => loadLocale(initialLocale))

export async function ensureLocale(locale: Locale): Promise<void> {
  await i18nReady
  await loadLocale(locale)
}

export { i18n }
